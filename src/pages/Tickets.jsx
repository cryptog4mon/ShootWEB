import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Plus,
  Ticket,
  Send,
  Search,
  User,
  Info,
  Paperclip,
  FileText,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../api';
import { getAuthItem } from '../utils/authStorage';
import './Tickets.css';

const WS_PORT = 5174;

const Tickets = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [tickets, setTickets] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [toast, setToast] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [preview, setPreview] = useState(null);
  const [isStaff, setIsStaff] = useState(false);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const wsRef = useRef(null);
  const userId = Number(getAuthItem('userId') || 0);
  const token = getAuthItem('authToken') || '';
  const isStaffRole = (role) => role === 'ADMIN' || role === 'DEVELOPER' || role === 'MODERATOR';

  const loadTickets = useCallback(async () => {
    if (!userId) return;
    try {
      if (isStaff) {
        const res = await api.listAdminTickets();
        const mapped = (res.tickets || []).map((t) => ({
          id: t.id,
          title: t.title,
          date: t.updated_at || t.created_at,
          status: t.status || 'open',
          user: t.username || '-',
          uid: t.user_id
        }));
        setTickets(mapped);
        setActiveTicketId((prev) => {
          if (!mapped.length) return null;
          const exists = prev && mapped.some((t) => t.id === prev);
          return exists ? prev : mapped[0].id;
        });
        return;
      }
      const res = await api.listTickets();
      const mapped = (res.tickets || []).map((t) => ({
        id: t.id,
        title: t.title,
        date: t.updated_at || t.created_at,
        status: t.status || 'open'
      }));
      setTickets(mapped);
      setActiveTicketId((prev) => {
        if (!mapped.length) return null;
        const exists = prev && mapped.some((t) => t.id === prev);
        return exists ? prev : mapped[0].id;
      });
    } catch {
      setTickets([]);
    }
  }, [userId, isStaff]);

  const loadMessages = useCallback(async (ticketId) => {
    if (!userId || !ticketId) return;
    try {
      const res = await api.listMessages(ticketId);
      const mapped = (res.messages || []).map((m) => ({
        from: isStaffRole(m.sender_role) ? 'mod' : 'user',
        text: m.message,
        time: m.created_at,
        name: m.sender_name || 'User',
        attachments: m.attachments
          ? m.attachments.map((a) => ({
              ...a,
              url: a.dataUrl || a.url
            }))
          : null
      }));
      setMessages(mapped);
    } catch {
      setMessages([]);
    }
  }, [userId, isStaff]);

  useEffect(() => {
    if (!userId || !token) {
      navigate('/login');
      return;
    }
    api.profile(userId)
      .then((res) => {
        const role = res.user?.role || 'DEFAULT';
        setIsStaff(isStaffRole(role));
        if (role === 'BANNED') {
          return;
        }
        if (!res.subscriptionActive) {
          navigate('/profile');
        }
      })
      .catch(() => navigate('/login'));
    document.body.classList.add('no-scroll');
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, [navigate, userId]);

  useEffect(() => {
    if (!userId) return;
    loadTickets();
  }, [userId, isStaff, loadTickets]);

  useEffect(() => {
    if (!activeTicketId) {
      setMessages([]);
      return;
    }
    loadMessages(activeTicketId);
  }, [activeTicketId, loadMessages]);

  useEffect(() => {
    if (!userId) return;
    const ws = new WebSocket(`ws://${window.location.hostname}:${WS_PORT}`);
    wsRef.current = ws;
    ws.addEventListener('open', () => {
      if (token) {
        ws.send(JSON.stringify({ type: 'auth', token }));
      }
    });
    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'message' || data.type === 'ticket_created' || data.type === 'ticket_closed') {
          loadTickets();
          if (activeTicketId) {
            loadMessages(activeTicketId);
          }
        }
        if (data.type === 'tickets_cleared') {
          setTickets([]);
          setMessages([]);
          setActiveTicketId(null);
        }
      } catch {
        // ignore
      }
    });
    ws.addEventListener('close', () => {
      wsRef.current = null;
    });
    return () => {
      ws.close();
    };
  }, [userId, activeTicketId, loadTickets, loadMessages]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((item) => {
      const matchesStatus = filter === 'all' || item.status === filter;
      const matchesQuery =
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        String(item.id).includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [tickets, filter, query]);

  const handleNewTicket = async () => {
    const hasOpen = tickets.some((t) => t.status === 'open');
    if (hasOpen) {
      setToast('You already have an open ticket. Please close it first.');
      return;
    }
    try {
      const created = await api.createTicket('');
      await loadTickets();
      setActiveTicketId(created.id);
      setMessages([]);
    } catch {
      setToast('Failed to create ticket.');
    }
  };

  useEffect(() => {
    if (!toast) return;
    setToastVisible(false);
    const showTimer = requestAnimationFrame(() => setToastVisible(true));
    const hideTimer = setTimeout(() => setToastVisible(false), 2600);
    const clearTimer = setTimeout(() => setToast(''), 3000);
    return () => {
      cancelAnimationFrame(showTimer);
      clearTimeout(hideTimer);
      clearTimeout(clearTimer);
    };
  }, [toast]);

  const handleSend = async () => {
    if (cooldown) {
      setToast('Wait 3 seconds before sending again.');
      return;
    }
    const text = messageText.trim();
    if (!text && pendingFiles.length === 0) return;
    if (!activeTicketId) return;
    const attachmentsPayload = pendingFiles.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      kind: file.kind,
      dataUrl: file.dataUrl,
      content: file.content
    }));
    try {
      await api.sendMessage(activeTicketId, text, attachmentsPayload);
      setMessageText('');
      setPendingFiles([]);
      await loadMessages(activeTicketId);
      setCooldown(true);
      setTimeout(() => setCooldown(false), 3000);
    } catch {
      setToast('Failed to send.');
    }
  };

  useEffect(() => {
    if (!chatEndRef.current) return;
    chatEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, activeTicketId]);

  const readTextFile = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => resolve('');
      reader.readAsText(file);
    });
  };

  const readImageFile = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const validateFiles = async (files) => {
    if (!files.length) return;
    const next = [];
    for (const file of files) {
      const isImage = file.type.startsWith('image/');
      const isText = file.type.startsWith('text/');
      const sizeMb = file.size / (1024 * 1024);
      if (isImage && sizeMb > 10) {
        setToast('Image max size is 10 MB.');
        continue;
      }
      if (isText && sizeMb > 5) {
        setToast('Text file max size is 5 MB.');
        continue;
      }
      if (!isImage && !isText) {
        setToast('Only images or text files are allowed.');
        continue;
      }
      if (isImage) {
        const dataUrl = await readImageFile(file);
        next.push({
          name: file.name,
          size: file.size,
          type: file.type,
          kind: 'image',
          url: URL.createObjectURL(file),
          dataUrl
        });
      } else {
        const content = await readTextFile(file);
        next.push({
          name: file.name,
          size: file.size,
          type: file.type,
          kind: 'text',
          content
        });
      }
    }
    if (next.length) {
      setPendingFiles((prev) => [...prev, ...next]);
    }
  };

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    await validateFiles(files);
    event.target.value = '';
  };

  const removePending = (index) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const openPreview = (file) => {
    if (file.kind === 'image' && (file.url || file.dataUrl)) {
      setPreview({ kind: 'image', name: file.name, url: file.url || file.dataUrl });
      return;
    }
    if (file.kind === 'text') {
      setPreview({ kind: 'text', name: file.name, content: file.content || '' });
    }
  };

  const handlePaste = async (event) => {
    const items = Array.from(event.clipboardData?.items || []);
    const files = [];
    items.forEach((item) => {
      if (item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (blob) {
          files.push(new File([blob], `pasted-${Date.now()}.png`, { type: blob.type }));
        }
      }
    });
    if (files.length) {
      event.preventDefault();
      await validateFiles(files);
    }
  };

  const activeMessages = activeTicketId ? messages : [];

  return (
    <motion.section
      className="tickets-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className="tickets-bg-grid"></div>
      <div className="tickets-bg-glow"></div>
      <div className="container tickets-container">
        <div className="tickets-card">
          <div className="tickets-header">
            <div className="tickets-title">
              <Ticket size={18} />
              <h2>Tickets</h2>
            </div>
            <button className="btn-hero-primary tickets-new no-hover" type="button" onClick={handleNewTicket}>
              <Plus size={16} />
              New ticket
            </button>
          </div>

          <div className="tickets-toolbar">
            <div className="ticket-filters">
              <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} type="button" onClick={() => setFilter('all')}>
                All
              </button>
              <button className={`filter-btn ${filter === 'open' ? 'active' : ''}`} type="button" onClick={() => setFilter('open')}>
                Open
              </button>
              <button className={`filter-btn ${filter === 'closed' ? 'active' : ''}`} type="button" onClick={() => setFilter('closed')}>
                Closed
              </button>
            </div>
            <div className="ticket-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search ticket..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="tickets-layout">
            <div className="tickets-panel">
              <div className="panel-title">Tickets list</div>
              <div className="tickets-list-scroll">
                {filteredTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className={`ticket-item ${ticket.status} ${activeTicketId === ticket.id ? 'active' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveTicketId(ticket.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setActiveTicketId(ticket.id);
                      }
                    }}
                  >
                    <div className="ticket-icon">
                      <MessageSquare size={16} />
                    </div>
                    <div className="ticket-info">
                      <div className="ticket-title">{ticket.title}</div>
                      <div className="ticket-meta">
                        ID: {ticket.id} • {ticket.status} • {ticket.date}
                        {isStaff && ticket.user ? ` • ${ticket.user} (UID ${ticket.uid})` : ''}
                      </div>
                    </div>
                    <div className="ticket-actions">
                      <div className={`ticket-status ${ticket.status}`}>
                        {ticket.status}
                      </div>
                      {ticket.status !== 'closed' && (
                        <button
                          className="close-btn"
                          type="button"
                          onClick={async (event) => {
                            event.stopPropagation();
                            try {
                              await api.closeTicket(ticket.id);
                              await loadTickets();
                            } catch {
                              setToast('Failed to close ticket.');
                            }
                          }}
                        >
                          Close
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="tickets-panel chat-panel"
              onDragOver={(e) => e.preventDefault()}
              onDrop={async (e) => {
                e.preventDefault();
                await validateFiles(Array.from(e.dataTransfer.files || []));
              }}
            >
              <div className="panel-title">Messenger</div>
              <div className="chat-thread chat-scroll">
                {activeMessages.map((msg, index) => (
                  <div key={`${msg.time}-${index}`} className={`chat-msg ${msg.from === 'mod' ? 'from-mod' : 'from-user'}`}>
                    <div className={`chat-avatar ${msg.from === 'mod' ? 'mod' : ''}`}>
                      <User size={16} />
                    </div>
                    <div className="chat-content">
                      {msg.text && <div className="msg-bubble">{msg.text}</div>}
                      {msg.attachments && (
                        <div className="msg-attachments">
                          {msg.attachments.map((file, fileIndex) => (
                            <div key={`${file.name}-${fileIndex}`} className="attachment-item">
                              {file.kind === 'image' && (file.url || file.dataUrl) ? (
                                <button className="attachment-image" type="button" onClick={() => openPreview(file)}>
                                  <img src={file.url || file.dataUrl} alt={file.name} />
                                </button>
                              ) : (
                                <button className="attachment-file" type="button" onClick={() => openPreview(file)}>
                                  <FileText size={14} />
                                  <span>{file.name}</span>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="msg-meta">
                        {msg.from === 'mod' ? `Moderator • ${msg.name}` : 'You'} • {msg.time}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef}></div>
              </div>
              <div className="chat-input">
                <div className="input-wrap">
                  <MessageSquare size={16} />
                  <input
                    type="text"
                    placeholder="Type message..."
                    value={messageText}
                    onPaste={handlePaste}
                    onChange={(e) => {
                      const next = e.target.value.replace(/[^a-zA-Z\u0400-\u04FF0-9\s.,!?]/g, '');
                      setMessageText(next);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <button className="attach-btn" type="button" onClick={() => fileInputRef.current?.click()}>
                    <Paperclip size={16} />
                  </button>
                  <input
                    ref={fileInputRef}
                    className="file-input"
                    type="file"
                    accept="image/*,text/*"
                    multiple
                    onChange={handleFiles}
                  />
                </div>
                <button className="btn-hero-primary send-btn no-hover" type="button" onClick={handleSend} disabled={cooldown}>
                  <Send size={16} />
                  Send
                </button>
              </div>
              {pendingFiles.length > 0 && (
                <div className="pending-files">
                  {pendingFiles.map((file, fileIndex) => (
                    <div key={`${file.name}-${fileIndex}`} className="pending-chip">
                      {file.kind === 'image' ? <ImageIcon size={14} /> : <FileText size={14} />}
                      <span>{file.name}</span>
                      <button type="button" onClick={() => openPreview(file)}>
                        View
                      </button>
                      <button type="button" onClick={() => removePending(fileIndex)}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {toast && (
        <div className={`toast ${toastVisible ? 'show' : ''}`}>
          <Info size={14} />
          <span>{toast}</span>
        </div>
      )}
      {preview && (
        <div className="preview-overlay" onClick={() => setPreview(null)}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <div className="preview-title">{preview.name}</div>
              <button type="button" className="preview-close" onClick={() => setPreview(null)}>
                <X size={16} />
              </button>
            </div>
            {preview.kind === 'image' && (
              <img className="preview-image" src={preview.url} alt={preview.name} />
            )}
            {preview.kind === 'text' && (
              <pre className="preview-text">{preview.content || 'Preview not available.'}</pre>
            )}
          </div>
        </div>
      )}
    </motion.section>
  );
};

export default Tickets;

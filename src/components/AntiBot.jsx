import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, Check, AlertCircle, RotateCcw } from 'lucide-react';
import './AntiBot.css';

const AntiBot = ({ onVerified, onError }) => {
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [challenge, setChallenge] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [attempts, setAttempts] = useState(0);
  const componentId = useRef(Math.random().toString(36).substr(2, 9));

  const generateChallenge = useCallback(() => {
    const challenges = [
      { question: 'What is 7 + 5?', answer: '12' },
      { question: 'What is 15 - 8?', answer: '7' },
      { question: 'What is 3 × 4?', answer: '12' },
      { question: 'What is 20 ÷ 4?', answer: '5' },
      { question: 'What is 9 + 6?', answer: '15' },
      { question: 'What is 18 - 9?', answer: '9' },
      { question: 'What is 6 × 3?', answer: '18' },
      { question: 'What is 25 ÷ 5?', answer: '5' },
      { question: 'What is 8 + 7?', answer: '15' },
      { question: 'What is 16 - 7?', answer: '9' }
    ];
    
    const randomChallenge = challenges[Math.floor(Math.random() * challenges.length)];
    setChallenge(randomChallenge.question);
    setCorrectAnswer(randomChallenge.answer);
    return randomChallenge.answer;
  }, []);

  const resetChallenge = useCallback(() => {
    generateChallenge();
    setAttempts(0);
    setUserAnswer('');
    setIsVerified(false);
    setIsVerifying(false);
  }, [generateChallenge]);

  useEffect(() => {
    resetChallenge();
  }, [resetChallenge]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isVerified || isVerifying) {
      return;
    }
    
    if (userAnswer.trim() === '') {
      if (onError) {
        onError('Please answer the question');
      }
      return;
    }

    setIsVerifying(true);
    
    // Simulate verification delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      if (userAnswer.trim() === correctAnswer) {
        setIsVerified(true);
        if (onVerified) {
          onVerified(true);
        }
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= 2) {
          // Generate new challenge after 2 failed attempts
          if (onError) {
            onError('Too many attempts. New question generated.');
          }
          generateChallenge();
          setUserAnswer('');
          setAttempts(0);
        } else {
          if (onError) {
            onError('Incorrect answer. Try again.');
          }
          setUserAnswer('');
        }
      }
    } catch (error) {
      if (onError) {
        onError('Verification failed. Please try again.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRetry = () => {
    resetChallenge();
  };

  if (isVerified) {
    return (
      <div className="antibot-container verified">
        <div className="antibot-success">
          <Check size={20} className="success-icon" />
          <span>Human verified ✓</span>
        </div>
      </div>
    );
  }

  return (
    <div className="antibot-container" id={`antibot-${componentId.current}`}>
      <div className="antibot-header">
        <Shield size={16} className="antibot-icon" />
        <span>Shoot Client AntiBot</span>
      </div>
      
      <form className="antibot-form" onSubmit={handleSubmit} noValidate>
        <div className="antibot-challenge">
          <label className="challenge-label">
            <AlertCircle size={14} className="challenge-icon" />
            Solve to continue:
          </label>
          <div className="challenge-question">{challenge}</div>
        </div>
        
        <div className="antibot-input">
          <input
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="Enter your answer"
            className="answer-input"
            disabled={isVerifying}
            autoComplete="off"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={3}
          />
        </div>
        
        <button
          type="submit"
          className="antibot-button"
          disabled={isVerifying || userAnswer.trim() === ''}
        >
          {isVerifying ? 'Verifying...' : 'Verify'}
        </button>
      </form>
      
      <div className="antibot-info">
        <small>Attempts remaining: {2 - attempts}</small>
      </div>
    </div>
  );
};

export default AntiBot;

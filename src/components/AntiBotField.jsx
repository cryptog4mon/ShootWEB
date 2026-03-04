import React, { useState, useEffect, useCallback } from 'react';
import { Shield, AlertCircle } from 'lucide-react';

const AntiBotField = ({ onVerified, onError }) => {
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [challenge, setChallenge] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [fieldLabel, setFieldLabel] = useState('');

  const generateChallenge = useCallback(() => {
    const challenges = [
      { question: 'What is 7 + 5?', answer: '12', label: 'Security Question' },
      { question: 'What is 15 - 8?', answer: '7', label: 'Verify Human' },
      { question: 'What is 3 × 4?', answer: '12', label: 'AntiBot Check' },
      { question: 'What is 20 ÷ 4?', answer: '5', label: 'Protection' },
      { question: 'What is 9 + 6?', answer: '15', label: 'Security Code' },
      { question: 'What is 18 - 9?', answer: '9', label: 'Verification' },
      { question: 'What is 6 × 3?', answer: '18', label: 'Human Check' },
      { question: 'What is 25 ÷ 5?', answer: '5', label: 'Bot Protection' },
      { question: 'What is 8 + 7?', answer: '15', label: 'Security Answer' },
      { question: 'What is 16 - 7?', answer: '9', label: 'Verify Code' }
    ];
    
    const randomChallenge = challenges[Math.floor(Math.random() * challenges.length)];
    setChallenge(randomChallenge.question);
    setCorrectAnswer(randomChallenge.answer);
    setFieldLabel(randomChallenge.label);
    return randomChallenge;
  }, []);

  const resetChallenge = useCallback(() => {
    const newChallenge = generateChallenge();
    setAttempts(0);
    setUserAnswer('');
    setIsVerified(false);
    setIsVerifying(false);
    return newChallenge;
  }, [generateChallenge]);

  useEffect(() => {
    resetChallenge();
  }, [resetChallenge]);

  const handleChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setUserAnswer(value);
    
    console.log('AntiBot input changed:', { value, correctAnswer, isVerified });
    
    // Auto-verify when user types the correct answer
    if (value === correctAnswer && !isVerified) {
      console.log('Correct answer entered, verifying...');
      setIsVerifying(true);
      
      setTimeout(() => {
        console.log('Verification complete, calling onVerified callback');
        setIsVerified(true);
        setIsVerifying(false);
        if (onVerified) {
          onVerified(true);
        }
      }, 300);
    }
  };

  const handleBlur = () => {
    if (userAnswer.trim() !== '' && userAnswer !== correctAnswer) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      
      if (newAttempts >= 2) {
        // Generate new challenge after 2 failed attempts
        if (onError) {
          onError('New security question generated.');
        }
        resetChallenge();
      } else {
        if (onError) {
          onError('Incorrect answer. Try again.');
        }
        setUserAnswer('');
      }
    }
  };

  if (isVerified) {
    return (
      <label className="input-label">
        <span className="verified-label">
          <Shield size={16} className="verified-icon" />
          {fieldLabel}
        </span>
        <div className="input-wrap verified">
          <input
            type="text"
            value="✓ Verified"
            className="verified-input"
            disabled
            readOnly
          />
        </div>
      </label>
    );
  }

  return (
    <label className="input-label">
      <span className="antibot-label">
        <AlertCircle size={16} className="antibot-icon" />
        {fieldLabel}
      </span>
      <div className="input-wrap">
        <input
          type="text"
          value={userAnswer}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={challenge}
          className={`antibot-input ${isVerifying ? 'verifying' : ''}`}
          disabled={isVerifying}
          autoComplete="off"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={3}
        />
      </div>
      <div className="antibot-hint">
        <small>{challenge}</small>
        {attempts > 0 && (
          <small className="attempts-hint">Attempts: {attempts}/2</small>
        )}
      </div>
    </label>
  );
};

export default AntiBotField;

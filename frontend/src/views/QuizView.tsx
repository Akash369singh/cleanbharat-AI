import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { QuizQuestion } from '../types';
import { useAuth } from '../context/AuthContext';
import { HelpCircle, CheckCircle2, XCircle, Award, AlertCircle, RefreshCw } from 'lucide-react';

export const QuizView: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getQuiz();
      setQuestions(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load quiz questions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleOptionSelect = (idx: number) => {
    if (result) return; // already submitted
    setSelectedOption(idx);
  };

  const handleSubmitAnswer = async () => {
    if (selectedOption === null || !questions[currentIdx]) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.submitQuiz(questions[currentIdx].id, selectedOption);
      setResult(res);
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Failed to evaluate answer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    setSelectedOption(null);
    setResult(null);
    setCurrentIdx((prev) => (prev + 1) % questions.length);
  };

  const currentQ = questions[currentIdx];

  return (
    <div className="max-w-2xl mx-auto space-y-4 text-left">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Swachh Segregation Challenge</h2>
          <p className="text-xs text-slate-500">
            Earn verified civic points by mastering 3-way source segregation rules (Max 50 points/day).
          </p>
        </div>
        <div className="bg-amber-100 text-amber-900 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5">
          <Award className="w-4 h-4 text-amber-600" />
          <span>Your Balance: {user?.points_balance || 0} pts</span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && <div className="p-8 text-center text-xs text-slate-500">Loading segregation quiz...</div>}

      {currentQ && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-xs space-y-5">
          <div className="flex items-center justify-between text-slate-400 font-medium">
            <span className="uppercase text-[11px] tracking-wider text-emerald-700 font-bold">
              Question {currentIdx + 1} of {questions.length} • {currentQ.category}
            </span>
            <span>Reward: +{currentQ.points} points</span>
          </div>

          <h3 className="text-base font-bold text-slate-900 leading-snug">
            {currentQ.question_text}
          </h3>

          <div className="space-y-2">
            {currentQ.options.map((opt, idx) => {
              const isSelected = selectedOption === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handleOptionSelect(idx)}
                  className={`w-full p-3 rounded-lg border text-left font-medium transition flex items-center justify-between ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <span>{opt}</span>
                  <span className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px]">
                    {String.fromCharCode(65 + idx)}
                  </span>
                </button>
              );
            })}
          </div>

          {result && (
            <div
              className={`p-4 rounded-lg border text-xs space-y-1.5 ${
                result.is_correct
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-bold text-sm">
                {result.is_correct ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Correct Answer! (+{result.points_earned} pts awarded)</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span>Incorrect Selection</span>
                  </>
                )}
              </div>
              <p className="text-slate-700 leading-relaxed">{result.explanation}</p>
              <div className="text-[11px] text-slate-500 pt-1">
                Daily cap remaining today: {result.daily_cap_remaining} pts
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end space-x-2">
            {!result ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={selectedOption === null || submitting}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition disabled:opacity-50"
              >
                {submitting ? 'Checking...' : 'Submit Answer'}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg transition"
              >
                Next Question
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

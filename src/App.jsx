import React, { useState } from 'react';
import "../src/App.css";
import ChatbotWidget from "../src/chatbot";
import { Bar, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

function App() {
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const uploadFileForAnalysis = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error(`Analysis failed: ${response.statusText}`);
      const data = await response.json();

      setAnalysis({
        overall_score: data.overall_score ?? 0,
        professional_summary: data.professional_summary ?? '',
        strengths: data.strengths ?? [],
        areas_for_improvement: data.areas_for_improvement ?? [],
        suggestions: data.suggestions ?? [],
        grouped_skills: data.grouped_skills ?? {},
        resume_text: data.resume_text ?? '',
        total_skills: data.total_skills ?? 0,
        word_count: data.word_count ?? 0,
        strong_keywords: data.strong_keywords ?? [],
        medium_keywords: data.medium_keywords ?? [],
      });

    } catch (err) {
      console.error('Error during analysis:', err);
      setError('Could not analyze the resume. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError('');
    } else {
      setError('Please select a valid PDF file.');
      setFile(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    setIsLoading(true);
    setError('');
    await uploadFileForAnalysis(file);
  };

  const getSkillsForDisplay = () => {
    if (!analysis?.grouped_skills) return [];
    const skills = [];
    Object.keys(analysis.grouped_skills).forEach((category) => {
      (analysis.grouped_skills[category] || []).forEach((skill) => {
        skills.push({ text: skill, category });
      });
    });
    return skills;
  };

  const getSkillsBarChart = () => {
    if (!analysis?.grouped_skills) return { labels: [], datasets: [] };
    const categories = Object.keys(analysis.grouped_skills);
    const counts = categories.map(cat => (analysis.grouped_skills[cat]?.length ?? 0));
    return {
      labels: categories.map(c => c.replace('_', ' ').toUpperCase()),
      datasets: [
        {
          label: 'Number of Skills',
          data: counts,
          backgroundColor: ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'],
        },
      ],
    };
  };

  const getRadarChartData = () => ({
    labels: ['Skills', 'Word Count', 'Overall Score'],
    datasets: [
      {
        label: 'Resume Metrics',
        data: [
          analysis?.total_skills ?? 0,
          analysis?.word_count ?? 0,
          analysis?.overall_score ?? 0,
        ],
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: '#3B82F6',
        borderWidth: 2,
      },
    ],
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8 relative">
      <div className="w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">ResumeWizard 🧙‍♂️</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Upload your resume and get instant, AI-powered feedback to land your dream job.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 justify-center items-stretch">
          {/* Left - Upload */}
          <div className="bg-white shadow-xl rounded-2xl p-8 w-full lg:w-2/5 xl:w-1/3 flex flex-col">
            <div className="flex flex-col items-center justify-center space-y-6 h-full">
              <div className="flex items-center justify-center w-24 h-24 bg-blue-100 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div className="text-center">
                <label htmlFor="file-upload" className="cursor-pointer bg-blue-600 text-white px-8 py-4 rounded-lg font-medium hover:bg-blue-700 transition duration-200 inline-block mb-4 text-lg">
                  {file ? 'Change File' : 'Choose PDF Resume'}
                </label>
                <input id="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf" />
                {file && <p className="text-md text-gray-600 mt-3">Selected: <span className="font-medium">{file.name}</span></p>}
                <p className="text-sm text-gray-500 mt-2">PDF up to 10MB</p>
              </div>
              {error && <p className="text-md text-red-600 py-2">{error}</p>}
              <button
                onClick={handleAnalyze}
                disabled={isLoading || !file}
                className={`px-10 py-4 rounded-lg font-medium text-white transition duration-200 text-lg mt-4 ${
                  (isLoading || !file) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 transform hover:scale-105'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Analyzing...</span>
                  </div>
                ) : 'Analyze My Resume'}
              </button>
            </div>
          </div>

          {/* Right - How it works */}
          <div className="bg-white shadow-xl rounded-2xl p-8 w-full lg:w-3/5 xl:w-2/3">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {['Upload', 'AI Analysis', 'Feedback'].map((title, i) => (
                <div key={i} className={`p-6 rounded-xl text-center ${i===0?'bg-blue-50':i===1?'bg-green-50':'bg-purple-50'}`}>
                  <div className={`p-3 rounded-full inline-flex items-center justify-center w-14 h-14 mb-4 ${i===0?'bg-blue-100':i===1?'bg-green-100':'bg-purple-100'}`}>
                    <span className={`font-bold text-xl ${i===0?'text-blue-600':i===1?'text-green-600':'text-purple-600'}`}>{i+1}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-xl mb-2">{title} {i===0?'Your Resume':i===1?'Analysis':'Results'}</h3>
                  <p className="text-gray-600">
                    {i===0?'Submit your current resume in PDF format':i===1?'Our AI scans for keywords, skills, and impact':'Receive actionable suggestions to improve your resume'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Results Section */}
        {analysis && (
          <div className="bg-white shadow-xl rounded-2xl p-8 mt-10 space-y-8 w-full">
            {/* ... all the analysis & charts here ... */}
            {/* You can keep all the same as before */}
          </div>
        )}
      </div>

      {/* Floating Chatbot */}
      <ChatbotWidget />
    </div>
  );
}

export default App;

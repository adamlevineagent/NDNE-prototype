import React, { useState } from 'react';
import { onboarding } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const OnboardingWizard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        agentName: '',
        agentColor: '#FFFFFF', // Default color
        priority: 'security',
        risk_tolerance: 'low',
        communication_style: 'direct',
        digestFrequency: 24,
        digestTone: 'neutral',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const totalSteps = 3; // Adjust as needed

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNext = async () => {
        setIsLoading(true);
        setError(null);
        let stepData: any = {};
        let apiStep = '';

        switch (step) {
            case 1: // Name & Appearance
                stepData = { agentName: formData.agentName, agentColor: formData.agentColor };
                apiStep = 'name_appearance';
                break;
            case 2: // Preferences
                // Construct preferences object from form fields
                const preferencesObj = {
                    priority: formData.priority,
                    risk_tolerance: formData.risk_tolerance,
                    communication_style: formData.communication_style
                };
                stepData = { preferences: preferencesObj };
                apiStep = 'preferences';
                break;
            case 3: // Digest Settings
                stepData = { digestFrequency: Number(formData.digestFrequency), digestTone: formData.digestTone };
                apiStep = 'digest_settings';
                break;
            default:
                setIsLoading(false);
                return;
        }

        try {
            // Use the API client to make the actual API call
            await onboarding.saveStep(step, stepData);

            if (step < totalSteps) {
                setStep(prev => prev + 1);
            } else {
                // Onboarding complete - redirect to dashboard
                navigate('/dashboard');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrevious = () => {
        if (step > 1) {
            setStep(prev => prev - 1);
        }
    };

    return (
        <div className="onboarding-container">
            <h2>Onboarding Wizard (Step {step}/{totalSteps})</h2>
            {error && <div className="error-message">Error: {error}</div>}

            {step === 1 && (
                <div>
                    <h3>Name Your Agent</h3>
                    <label>
                        Agent Name:
                        <input type="text" name="agentName" value={formData.agentName} onChange={handleChange} required />
                    </label>
                    <br />
                    <label>
                        Agent Color:
                        <input type="color" name="agentColor" value={formData.agentColor} onChange={handleChange} />
                    </label>
                </div>
            )}

            {step === 2 && (
                <div>
                    <h3>Set Agent Preferences</h3>
                    
                    <div className="preference-group">
                        <label>Priority:</label>
                        <select
                            name="priority"
                            value={formData.priority}
                            onChange={handleChange}
                        >
                            <option value="security">Security</option>
                            <option value="performance">Performance</option>
                            <option value="cost">Cost</option>
                            <option value="innovation">Innovation</option>
                        </select>
                    </div>
                    
                    <div className="preference-group">
                        <label>Risk Tolerance:</label>
                        <select
                            name="risk_tolerance"
                            value={formData.risk_tolerance}
                            onChange={handleChange}
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>
                    
                    <div className="preference-group">
                        <label>Communication Style:</label>
                        <select
                            name="communication_style"
                            value={formData.communication_style}
                            onChange={handleChange}
                        >
                            <option value="direct">Direct</option>
                            <option value="detailed">Detailed</option>
                            <option value="concise">Concise</option>
                        </select>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div>
                    <h3>Configure Digests</h3>
                    <label>
                        Frequency (hours):
                        <input type="number" name="digestFrequency" value={formData.digestFrequency} onChange={handleChange} min="1" />
                    </label>
                    <br />
                    <label>
                        Tone:
                        <select name="digestTone" value={formData.digestTone} onChange={handleChange}>
                            <option value="neutral">Neutral</option>
                            <option value="friendly">Friendly</option>
                            <option value="formal">Formal</option>
                        </select>
                    </label>
                </div>
            )}

            <hr />
            <button onClick={handlePrevious} disabled={step === 1 || isLoading}>
                Previous
            </button>
            <button onClick={handleNext} disabled={isLoading}>
                {isLoading ? 'Saving...' : (step === totalSteps ? 'Finish Onboarding' : 'Next')}
            </button>
        </div>
    );
};

export default OnboardingWizard;
import React, { useCallback, useState } from 'react';
import './JobApplicationForm.css';
import { useClient } from '@liveblocks/react';
import { AiMessageContent, AiToolContent } from '@liveblocks/core';

interface Experience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
}

const APPLICATION_SCHEMA = {
  type: 'object',
  properties: {
    personalInfo: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'The full name of the applicant' },
        email: { type: 'string', format: 'email', description: 'The email address of the applicant' },
        phone: { type: 'string', description: 'The phone number of the applicant' },
        address: { type: 'string', description: 'The address of the applicant' }
      },
      required: ['name', 'email', 'phone', 'address']
    },
    education: {
      type: 'object',
      properties: {
        school: { type: 'string', description: 'The name of the school or university' },
        degree: { type: 'string', description: 'The degree or qualification of the applicant' },
        startYear: { type: 'string', description: 'The start year of the applicant\'s education' },
        endYear: { type: 'string', description: 'The end year of the applicant\'s education' },
        major: { type: 'string', description: 'The major or field of study of the applicant' }
      },
      required: ['school', 'degree', 'startYear', 'endYear', 'major']
    },
    experiences: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The unique identifier of the experience' },
          company: { type: 'string', description: 'The name of the company the applicant worked at' },
          position: { type: 'string', description: 'The position of the applicant at the company' },
          startDate: { type: 'string', description: 'The start date of the applicant\'s employment' },
          endDate: { type: 'string', description: 'The end date of the applicant\'s employment' },
          description: { type: 'string', description: 'A description of the applicant\'s responsibilities and achievements at the company' }
        },
        required: ['id', 'company', 'position', 'startDate', 'endDate', 'description']
      }
    }
  },
  required: ['personalInfo', 'education', 'experiences']

};

interface UseAiGenerationOptions<T> {
  prompt: string;
  name: string;
  description: string;
  schema: Record<string, any>;
  onSuccess?: (data: T) => void;
}

function useAiAction<T>({ prompt, name, description, schema, onSuccess }: UseAiGenerationOptions<T>) {
  const client = useClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const executeAction = useCallback(async () => {
    setIsGenerating(true);
    let result: AiMessageContent[] | undefined;
    try {
      result = await client.ai.statelessAction(prompt, {
        name,
        description,
        parameter_schema: schema,
      });
    } catch (error) {
      console.error(error);
      setIsGenerating(false);
      return;
    }
    if (result) {
      const toolCallResult = result.find(item =>
        item.type === "tool-call" && item.name === name
      ) as AiToolContent | undefined;

      console.log(toolCallResult, toolCallResult?.args);
      if (toolCallResult && toolCallResult.args && onSuccess) {
        onSuccess(toolCallResult.args as T);
      }
    }
    setIsGenerating(false);
  }, [client, prompt, name, description, schema, onSuccess]);

  return { executeAction, isGenerating };
}

const JobApplicationForm: React.FC = () => {
  const [formData, setFormData] = useState({
    personalInfo: {
      name: '',
      email: '',
      phone: '',
      address: '',
    },
    education: {
      school: '',
      degree: '',
      startYear: '',
      endYear: '',
      major: '',
    },
    experiences: [] as Experience[],
  });

  const { executeAction, isGenerating } = useAiAction({
    prompt: 'Generate a job application for an imaginary person, make up a person and all their data',
    name: 'generateJobApplication',
    description: 'Generate a job application for me',
    schema: APPLICATION_SCHEMA,
    onSuccess: setFormData
  });

  const handlePersonalInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      personalInfo: {
        ...formData.personalInfo,
        [name]: value,
      },
    });
  };

  const handleEducationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      education: {
        ...formData.education,
        [name]: value,
      },
    });
  };

  const addExperience = () => {
    const newExperience: Experience = {
      id: Date.now().toString(),
      company: '',
      position: '',
      startDate: '',
      endDate: '',
      description: '',
    };

    setFormData({
      ...formData,
      experiences: [...formData.experiences, newExperience],
    });
  };

  const removeExperience = (id: string) => {
    setFormData({
      ...formData,
      experiences: formData.experiences.filter((exp) => exp.id !== id),
    });
  };

  const handleExperienceChange = (id: string, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      experiences: formData.experiences.map((exp) =>
        exp.id === id ? { ...exp, [name]: value } : exp
      ),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // Handle form submission (e.g., send to API)
  };

  return (
    <div className="job-application-form">
      <h1>Job Application</h1>
      <button
        type="button"
        className="magic-button"
        onClick={executeAction}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <>
            <span className="spinner"></span>
            Generating...
          </>
        ) : (
          'Generate Magically'
        )}
      </button>
      <form onSubmit={handleSubmit}>
        {/* Personal Information Section */}
        <section>
          <h2>Personal Information</h2>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.personalInfo.name}
              onChange={handlePersonalInfoChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.personalInfo.email}
              onChange={handlePersonalInfoChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.personalInfo.phone}
              onChange={handlePersonalInfoChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">Address</label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.personalInfo.address}
              onChange={handlePersonalInfoChange}
            />
          </div>
        </section>

        {/* Education Section */}
        <section>
          <h2>Education</h2>
          <div className="form-group">
            <label htmlFor="school">School/University</label>
            <input
              type="text"
              id="school"
              name="school"
              value={formData.education.school}
              onChange={handleEducationChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="degree">Degree</label>
            <input
              type="text"
              id="degree"
              name="degree"
              value={formData.education.degree}
              onChange={handleEducationChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="major">Major/Field of Study</label>
            <input
              type="text"
              id="major"
              name="major"
              value={formData.education.major}
              onChange={handleEducationChange}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startYear">Start Year</label>
              <input
                type="text"
                id="startYear"
                name="startYear"
                value={formData.education.startYear}
                onChange={handleEducationChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="endYear">End Year (or Expected)</label>
              <input
                type="text"
                id="endYear"
                name="endYear"
                value={formData.education.endYear}
                onChange={handleEducationChange}
                required
              />
            </div>
          </div>
        </section>

        {/* Work Experience Section */}
        <section>
          <h2>Work Experience</h2>
          {formData.experiences.map((experience) => (
            <div key={experience.id} className="experience-entry">
              <div className="form-group">
                <label htmlFor={`company-${experience.id}`}>Company</label>
                <input
                  type="text"
                  id={`company-${experience.id}`}
                  name="company"
                  value={experience.company}
                  onChange={(e) => handleExperienceChange(experience.id, e)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor={`position-${experience.id}`}>Position</label>
                <input
                  type="text"
                  id={`position-${experience.id}`}
                  name="position"
                  value={experience.position}
                  onChange={(e) => handleExperienceChange(experience.id, e)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor={`startDate-${experience.id}`}>Start Date</label>
                  <input
                    type="text"
                    id={`startDate-${experience.id}`}
                    name="startDate"
                    value={experience.startDate}
                    onChange={(e) => handleExperienceChange(experience.id, e)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor={`endDate-${experience.id}`}>End Date</label>
                  <input
                    type="text"
                    id={`endDate-${experience.id}`}
                    name="endDate"
                    value={experience.endDate}
                    onChange={(e) => handleExperienceChange(experience.id, e)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor={`description-${experience.id}`}>Description</label>
                <textarea
                  id={`description-${experience.id}`}
                  name="description"
                  value={experience.description}
                  onChange={(e) => handleExperienceChange(experience.id, e)}
                  rows={3}
                />
              </div>

              <button
                type="button"
                className="remove-button"
                onClick={() => removeExperience(experience.id)}
              >
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="add-button" onClick={addExperience}>
            Add Experience
          </button>
        </section>

        <button type="submit" className="submit-button">
          Submit Application
        </button>
      </form>
    </div>
  );
};

export default JobApplicationForm; 
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import styles from './Careers.module.css';

interface Job {
  id: number;
  title: string;
  description: string;
  requirements: string[];
}

interface ApplicationData {
  firstName: string;
  lastName: string;
  jobTitle: string;
  attachment: File | null;
}

export default function CareersPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applicationData, setApplicationData] = useState<ApplicationData>({
    firstName: '',
    lastName: '',
    jobTitle: '',
    attachment: null,
  });
  const [submissionStatus, setSubmissionStatus] = useState(false);

  useEffect(() => {
    // Static job data (since there’s no backend)
    const staticJobs: Job[] = [
      {
        id: 1,
        title: 'Chef',
        description: 'Lead our kitchen team to prepare exquisite dishes.',
        requirements: [
          'Culinary degree or equivalent experience',
          '5+ years in a high-end kitchen',
          'Expertise in various cuisines',
          'Strong leadership and team management skills',
        ],
      },
      {
        id: 2,
        title: 'Waitress',
        description: 'Provide excellent service to our guests.',
        requirements: [
          'High school diploma or equivalent',
          '1+ year of experience in a restaurant',
          'Excellent communication skills',
          'Ability to work in a fast-paced environment',
        ],
      },
      {
        id: 3,
        title: 'Bartender',
        description: 'Craft and serve a variety of beverages.',
        requirements: [
          'Experience as a bartender',
          'Knowledge of mixology and drink recipes',
          'Excellent customer service skills',
          'Ability to handle cash transactions',
        ],
      },
      {
        id: 4,
        title: 'Dishwasher',
        description: 'Maintain cleanliness of kitchenware and work area.',
        requirements: [
          'Ability to work under pressure',
          'Attention to detail',
          'Good time management skills',
          'Physical stamina',
        ],
      },
    ];
    setJobs(staticJobs);
  }, []);

  const handleApplyClick = (job: Job) => {
    setSelectedJob(job);
    setApplicationData({
      firstName: '',
      lastName: '',
      jobTitle: job.title,
      attachment: null,
    });
    setShowApplicationForm(true);
    setSubmissionStatus(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setApplicationData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApplicationData((prev) => ({
      ...prev,
      attachment: e.target.files ? e.target.files[0] : null,
    }));
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Simulate a successful submission
    console.log('Application Submitted:', applicationData);
    setSubmissionStatus(true);
    setShowApplicationForm(false);
  };

  const handleCancel = () => {
    setShowApplicationForm(false);
    setSubmissionStatus(false);
  };

  return (
    <div className={styles.careersContainer}>
      <Image
        src="/assets/img/careers-cover.jpg"
        alt="Careers Cover"
        layout="responsive"
        width={1200}
        height={600}
        className={styles.careersCover}
      />
      <h1 className={styles.careersTitle}>Join Our Team</h1>
      <div className={styles.jobsList}>
        {jobs.length === 0 ? (
          <p>No job postings available at the moment.</p>
        ) : (
          jobs.map((job) => (
            <div key={job.id} className={styles.jobCard}>
              <h2 className={styles.jobTitle}>{job.title}</h2>
              <p className={styles.jobDescription}>{job.description}</p>
              <h3>Requirements:</h3>
              <ul className={styles.requirementsList}>
                {job.requirements.map((req, index) => (
                  <li key={index}>{req}</li>
                ))}
              </ul>
              <button
                className={styles.applyButton}
                onClick={() => handleApplyClick(job)}
              >
                Apply
              </button>
            </div>
          ))
        )}
      </div>

      {showApplicationForm && selectedJob && (
        <div className={styles.applicationFormOverlay}>
          <div className={styles.applicationFormContainer}>
            <h2>Apply for {selectedJob.title}</h2>
            <form onSubmit={handleFormSubmit} className={styles.applicationForm}>
              <div className={styles.formGroup}>
                <label htmlFor="firstName">First Name *</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={applicationData.firstName}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter your first name"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="lastName">Last Name *</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={applicationData.lastName}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter your last name"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="jobTitle">Job Applying For *</label>
                <input
                  type="text"
                  id="jobTitle"
                  name="jobTitle"
                  value={applicationData.jobTitle}
                  readOnly
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="attachment">Attach Your Resume/CV *</label>
                <input
                  type="file"
                  id="attachment"
                  name="attachment"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  required
                />
                <small className={styles.fileNote}>
                  Attach PDF, Word, Text, JPEG, or PNG.
                </small>
              </div>
              <div className={styles.formActions}>
                <button type="submit" className={styles.submitButton}>
                  Submit Application
                </button>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={handleCancel}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {submissionStatus && (
        <div className={styles.submissionConfirmation}>
          <p>Your application has been submitted successfully!</p>
        </div>
      )}
    </div>
  );
}

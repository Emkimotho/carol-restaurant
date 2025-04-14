"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import styles from "./Careers.module.css";

// Update the Job interface to match your API/Prisma schema.
export interface Job {
  id: string;
  title: string;
  description: string;
  requirements: string; // comma-separated string
  deadline: string; // ISO string
}

// Update the ApplicationData interface to include an email field.
export interface ApplicationData {
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  attachment: File | null;
}

export default function Careers() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applicationData, setApplicationData] = useState<ApplicationData>({
    firstName: "",
    lastName: "",
    email: "",
    jobTitle: "",
    attachment: null,
  });
  const [submissionStatus, setSubmissionStatus] = useState(false);

  // Clear toaster message after 5 seconds
  useEffect(() => {
    if (submissionStatus) {
      const timer = setTimeout(() => {
        setSubmissionStatus(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [submissionStatus]);

  // Helper: checks if the job deadline has passed
  const isDeadlinePassed = (deadline: string) => new Date() > new Date(deadline);

  // Fetch jobs from the API on component mount
  useEffect(() => {
    async function fetchJobs() {
      try {
        const res = await fetch("/api/careers");
        if (!res.ok) throw new Error("Failed to fetch careers");
        const data = await res.json();
        setJobs(data.careers);
      } catch (error) {
        console.error(error);
      }
    }
    fetchJobs();
  }, []);

  const handleApplyClick = (job: Job) => {
    setSelectedJob(job);
    setApplicationData({
      firstName: "",
      lastName: "",
      email: "",
      jobTitle: job.title,
      attachment: null,
    });
    setShowApplicationForm(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setApplicationData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApplicationData((prev) => ({
      ...prev,
      attachment: e.target.files ? e.target.files[0] : null,
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Build FormData to include text fields and file.
    try {
      const formData = new FormData();
      formData.append("firstName", applicationData.firstName);
      formData.append("lastName", applicationData.lastName);
      formData.append("email", applicationData.email);
      formData.append("jobTitle", applicationData.jobTitle);
      if (applicationData.attachment) {
        formData.append("attachment", applicationData.attachment);
      }
      const res = await fetch("/api/careers/applications", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Application submission failed");
      console.log("Application Submitted:", applicationData);
      setSubmissionStatus(true);
      setShowApplicationForm(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCancel = () => {
    setShowApplicationForm(false);
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
          jobs.map((job) => {
            const deadlinePassed = isDeadlinePassed(job.deadline);
            const requirementItems = job.requirements.split(",").map((req) => req.trim());
            return (
              <div key={job.id} className={styles.jobCard}>
                <h2 className={styles.jobTitle}>{job.title}</h2>
                <p className={styles.jobDescription}>{job.description}</p>
                <h3>Requirements:</h3>
                <ul className={styles.requirementsList}>
                  {requirementItems.map((req, index) => (
                    <li key={index}>{req}</li>
                  ))}
                </ul>
                <p className={styles.deadline}>
                  <strong>Application Deadline:</strong> {new Date(job.deadline).toLocaleString()}
                </p>
                {deadlinePassed ? (
                  <button className={styles.expiredButton} disabled>
                    Expired
                  </button>
                ) : (
                  <button className={styles.applyButton} onClick={() => handleApplyClick(job)}>
                    Apply
                  </button>
                )}
              </div>
            );
          })
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
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={applicationData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter your email address"
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

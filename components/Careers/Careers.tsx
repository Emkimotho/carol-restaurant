/* File: components/Careers/Careers.tsx
   ------------------------------------------------------------------
   • Only change: when building FormData we now send the file under
     the key **resumeUrl** (the API route’s expected field name).
   • All other logic, UI, and comments remain exactly as before.
   ------------------------------------------------------------------ */

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import styles from "./Careers.module.css";

/* ---------- Types ---------- */
export interface Job {
  id: string;
  title: string;
  description: string;
  requirements: string;       // comma-separated
  deadline: string;           // ISO
}

export interface ApplicationData {
  firstName: string;
  lastName:  string;
  email:     string;
  jobTitle:  string;
  attachment: File | null;    // résumé file
}

export default function Careers() {
  /* ---------- State ---------- */
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applicationData, setApplicationData] = useState<ApplicationData>({
    firstName: "",
    lastName:  "",
    email:     "",
    jobTitle:  "",
    attachment: null,
  });
  const [submissionStatus, setSubmissionStatus] = useState(false);

  /* ---------- auto-hide toast ---------- */
  useEffect(() => {
    if (submissionStatus) {
      const t = setTimeout(() => setSubmissionStatus(false), 5000);
      return () => clearTimeout(t);
    }
  }, [submissionStatus]);

  /* ---------- fetch jobs on mount ---------- */
  useEffect(() => {
    (async function fetchJobs() {
      try {
        const res = await fetch("/api/careers");
        if (!res.ok) throw new Error("Failed to fetch careers");
        const { careers } = await res.json();
        setJobs(careers);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  /* ---------- helpers ---------- */
  const isDeadlinePassed = (deadline: string) =>
    new Date() > new Date(deadline);

  const handleApplyClick = (job: Job) => {
    setSelectedJob(job);
    setApplicationData({
      firstName: "",
      lastName:  "",
      email:     "",
      jobTitle:  job.title,
      attachment: null,
    });
    setShowApplicationForm(true);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setApplicationData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setApplicationData(prev => ({
      ...prev,
      attachment: e.target.files ? e.target.files[0] : null,
    }));
  };

  /* ---------- submit ---------- */
  const handleFormSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("firstName", applicationData.firstName);
      formData.append("lastName",  applicationData.lastName);
      formData.append("email",     applicationData.email);
      formData.append("jobTitle",  applicationData.jobTitle);
      if (applicationData.attachment) {
        /* The API expects this field name               ↓↓↓↓↓↓↓ */
        formData.append("resumeUrl", applicationData.attachment);
      }

      const res = await fetch("/api/careers/applications", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Application submission failed");

      console.log("Application Submitted:", applicationData);
      setSubmissionStatus(true);
      setShowApplicationForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancel = () => setShowApplicationForm(false);

  /* ---------- Render ---------- */
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
          jobs.map(job => {
            const expired = isDeadlinePassed(job.deadline);
            const reqs = job.requirements
              .split(",")
              .map(r => r.trim());

            return (
              <div key={job.id} className={styles.jobCard}>
                <h2 className={styles.jobTitle}>{job.title}</h2>
                <p className={styles.jobDescription}>{job.description}</p>

                <h3>Requirements:</h3>
                <ul className={styles.requirementsList}>
                  {reqs.map((r, i) => <li key={i}>{r}</li>)}
                </ul>

                <p className={styles.deadline}>
                  <strong>Application Deadline:</strong>{" "}
                  {new Date(job.deadline).toLocaleString()}
                </p>

                {expired ? (
                  <button className={styles.expiredButton} disabled>
                    Expired
                  </button>
                ) : (
                  <button
                    className={styles.applyButton}
                    onClick={() => handleApplyClick(job)}
                  >
                    Apply
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ---------- Application Modal ---------- */}
      {showApplicationForm && selectedJob && (
        <div className={styles.applicationFormOverlay}>
          <div className={styles.applicationFormContainer}>
            <h2>Apply for {selectedJob.title}</h2>
            <form onSubmit={handleFormSubmit} className={styles.applicationForm}>
              <div className={styles.formGroup}>
                <label htmlFor="firstName">First Name *</label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={applicationData.firstName}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter your first name"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="lastName">Last Name *</label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={applicationData.lastName}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter your last name"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="email">Email *</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={applicationData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter your email address"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="jobTitle">Job Applying For *</label>
                <input
                  id="jobTitle"
                  name="jobTitle"
                  type="text"
                  value={applicationData.jobTitle}
                  readOnly
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="attachment">Attach Your Resume/CV *</label>
                <input
                  id="attachment"
                  name="attachment"
                  type="file"
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
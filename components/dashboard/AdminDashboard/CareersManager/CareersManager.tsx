"use client";

import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { toast } from "react-toastify";
import styles from "./CareersManager.module.css";

interface Career {
  id: string;
  title: string;
  description: string;
  requirements: string; // Comma-separated string
  deadline: string; // ISO string
}

interface Application {
  id: string;
  applicantName: string;
  jobTitle: string;
  resumeUrl: string;
}

const CareersManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"manage" | "applications">("manage");
  const [careers, setCareers] = useState<Career[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [formData, setFormData] = useState<Career>({
    id: "",
    title: "",
    description: "",
    requirements: "",
    deadline: "",
  });
  const [isEditing, setIsEditing] = useState(false);

  // Fetch careers and applications when component mounts.
  useEffect(() => {
    fetchCareers();
    fetchApplications();
  }, []);

  const fetchCareers = async () => {
    try {
      const res = await fetch("/api/careers");
      if (!res.ok) throw new Error("Failed to fetch careers");
      const data = await res.json();
      setCareers(data.careers);
    } catch (error: any) {
      console.error("Error fetching careers:", error);
      toast.error("Failed to fetch career postings.");
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await fetch("/api/careers/applications");
      if (!res.ok) throw new Error("Failed to fetch applications");
      const data = await res.json();
      setApplications(data.applications);
    } catch (error: any) {
      console.error("Error fetching applications:", error);
      toast.error("Failed to fetch applications.");
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // Basic validation
    if (!formData.title || !formData.description || !formData.deadline) {
      toast.error("Please fill in all required fields.");
      return;
    }
    try {
      const endpoint = isEditing ? `/api/careers/${formData.id}` : "/api/careers";
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const errorData = await res.json();
        toast.error("Error: " + errorData.message);
        return;
      }
      toast.success(isEditing ? "Career updated successfully!" : "Career created successfully!");
      setFormData({ id: "", title: "", description: "", requirements: "", deadline: "" });
      setIsEditing(false);
      fetchCareers();
    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast.error("Submission failed.");
    }
  };

  const handleEdit = (career: Career) => {
    console.log("Editing career:", career);
    setFormData(career);
    setIsEditing(true);
    setActiveTab("manage");
    // Scroll to top so that the form is visible
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this career posting?")) return;
    try {
      const res = await fetch(`/api/careers/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const errorData = await res.json();
        toast.error("Error: " + errorData.message);
        return;
      }
      toast.success("Career deleted successfully!");
      fetchCareers();
    } catch (error: any) {
      console.error("Error deleting career:", error);
      toast.error("Deletion failed.");
    }
  };

  const handleDeleteApplication = async (id: string) => {
    if (!confirm("Are you sure you want to delete this application?")) return;
    try {
      const res = await fetch(`/api/careers/applications/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const errorData = await res.json();
        toast.error("Error: " + errorData.message);
        return;
      }
      toast.success("Application deleted successfully!");
      fetchApplications();
    } catch (error: any) {
      console.error("Error deleting application:", error);
      toast.error("Deletion failed.");
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Careers Manager</h2>
      <div className={styles.tabButtons}>
        <button 
          className={`${styles.tabButton} ${activeTab === "manage" ? styles.active : ""}`}
          onClick={() => setActiveTab("manage")}
        >
          Manage Careers
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === "applications" ? styles.active : ""}`}
          onClick={() => setActiveTab("applications")}
        >
          View Applications
        </button>
      </div>

      {activeTab === "manage" && (
        <div className={styles.manageSection}>
          <h3>{isEditing ? "Edit Career" : "Create New Career"}</h3>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="title">Job Title *</label>
              <input 
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="description">Description *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="requirements">Requirements (comma separated)</label>
              <textarea
                id="requirements"
                name="requirements"
                value={formData.requirements}
                onChange={handleInputChange}
                placeholder="Separate multiple requirements with commas"
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="deadline">Application Deadline *</label>
              <input
                type="datetime-local"
                id="deadline"
                name="deadline"
                value={formData.deadline}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className={styles.formActions}>
              <button type="submit" className={styles.submitButton}>
                {isEditing ? "Update Career" : "Create Career"}
              </button>
              {isEditing && (
                <button 
                  type="button" 
                  className={styles.cancelButton} 
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({ id: "", title: "", description: "", requirements: "", deadline: "" });
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
          <hr className={styles.separator} />
          <h3>Existing Career Postings</h3>
          {careers.length === 0 ? (
            <p>No career postings available.</p>
          ) : (
            <ul className={styles.careerList}>
              {careers.map((career) => (
                <li key={career.id} className={styles.careerItem}>
                  <div className={styles.careerDetails}>
                    <strong>{career.title}</strong>
                    <p>{career.description}</p>
                    <p>
                      <em>Deadline: {new Date(career.deadline).toLocaleString()}</em>
                    </p>
                    {career.requirements && (
                      <div>
                        <small>Requirements:</small>
                        <ul>
                          {career.requirements
                            .split(",")
                            .map((req) => req.trim())
                            .map((req, index) => (
                              <li key={index}>{req}</li>
                            ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className={styles.actionButtons}>
                    <button 
                      className={styles.editButton} 
                      onClick={() => handleEdit(career)}
                    >
                      Edit
                    </button>
                    <button 
                      className={styles.deleteButton} 
                      onClick={() => handleDelete(career.id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === "applications" && (
        <div className={styles.applicationsSection}>
          <h3>Submitted Job Applications</h3>
          {applications.length === 0 ? (
            <p>No applications submitted.</p>
          ) : (
            <ul className={styles.applicationList}>
              {applications.map((app, index) => (
                <li key={app.id} className={styles.applicationItem}>
                  <div className={styles.applicationDetails}>
                    <span>{index + 1}. </span>
                    <strong>{app.applicantName}</strong> applied for <em>{app.jobTitle}</em>
                  </div>
                  <div>
                    <a 
                      href={app.resumeUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={styles.viewButton}
                    >
                      View Resume
                    </a>
                    <button 
                      onClick={() => handleDeleteApplication(app.id)}
                      className={styles.deleteButton}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default CareersManager;

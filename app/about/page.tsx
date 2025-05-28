

import React from 'react';
import { FaBriefcase, FaUtensils, FaShippingFast, FaStore, FaSpa, FaBuilding } from 'react-icons/fa';
import styles from './page.module.css';

export const metadata = {
  title: 'About Us | The 19th Hole',
  description: 'Learn more about The 19th Hole Restaurant and Bar, our mission, and the exceptional services we offer.',
};

const AboutUsPage = () => {
  return (
    <div className={styles.aboutUsPage}>
      {/* About Section */}
      <section className={styles.aboutSection}>
        <div className="container">
          <h1 className={styles.aboutTitle}>About Us</h1>
          <p className={styles.aboutDescription}>
            Experience fine dining at its best at The 19th Hole Restaurant and Bar. Nestled within the scenic Black Rock Golf Course,
            we offer an exquisite menu and unparalleled service that caters to all your senses.
          </p>
        </div>
      </section>

      {/* Services Section */}
      <section className={styles.servicesSection}>
        <div className="container">
          <h2 className={styles.servicesTitle}>Our Services</h2>
          <p className={styles.servicesDescription}>
            At The 19th Hole, we are more than just a restaurant. We proudly offer a range of services to elevate your experience:
          </p>
          <div className={styles.servicesList}>
            <div className={styles.serviceItem}>
              <FaBuilding className={styles.serviceIcon} />
              <h3>Exclusive Event &amp; Corporate Venue</h3>
              <p>
                Host your corporate meetings, private events, or special gatherings in our serene venue, complete with a stunning lake view and premium amenities within a prestigious golf club environment.
              </p>
            </div>
            <div className={styles.serviceItem}>
              <FaUtensils className={styles.serviceIcon} />
              <h3>Event and Corporate Catering</h3>
              <p>
                Enjoy delicious and customizable catering options tailored to suit any occasion.
              </p>
            </div>
            <div className={styles.serviceItem}>
              <FaShippingFast className={styles.serviceIcon} />
              <h3>Lunch Deliveries</h3>
              <p>
                Experience fresh and timely lunch deliveries straight to your office or home.
              </p>
            </div>
            <div className={styles.serviceItem}>
              <FaStore className={styles.serviceIcon} />
              <h3>Dine-In or Carry Out</h3>
              <p>
                Savor our exquisite meals in a relaxing atmosphere or opt for a convenient carry-out.
              </p>
            </div>
            <div className={styles.serviceItem}>
              <FaSpa className={styles.serviceIcon} />
              <h3>Relaxing Atmosphere</h3>
              <p>
                Immerse yourself in a calming environment perfect for unwinding and enjoying quality time.
              </p>
            </div>
            <div className={styles.serviceItem}>
              <FaUtensils className={styles.serviceIcon} />
              <h3>Online Ordering</h3>
              <p>
                Conveniently place your orders online with options for both pickup and delivery.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutUsPage;
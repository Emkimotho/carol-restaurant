// File: components/Footer/Footer.tsx

"use client";

import React from 'react';
import { useOpeningHours } from '../../contexts/OpeningHoursContext';
import Link from 'next/link';
import Image from 'next/image';
import {
  FaFacebookF,
  FaTwitter,
  FaYoutube,
  FaLinkedinIn,
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaInstagram,
  FaTiktok,
} from 'react-icons/fa';
import { convertTo12Hour } from '../../utils/timeUtils';
import styles from './Footer.module.css';

interface OpeningHours {
  [day: string]: {
    open: string;
    close: string;
  };
}

const Footer: React.FC = () => {
  const { openingHours } = useOpeningHours();

  return (
    <footer id="footer" className={styles.footer}>
      <div className={styles.footerContainer}>
        <div className={styles.footerGrid}>
          {/* Column 1: About and Opening Hours */}
          <div className={styles.footerColumn}>
            <div className={styles.logoAndHours}>
              <Image
                src="/images/19th-hole-logo-footer.png"
                alt="The 19th Hole Restaurant and Bar at Black Rock"
                className={styles.footerLogo}
                width={250}
                height={100}
              />
              <p className={styles.aboutParagraph}>
                Discover culinary delights, recipes, and inspiration in our food haven.
              </p>
              <h4 className={styles.widgetTitle}>Our Opening Hours</h4>
              <ul className={styles.openingHours}>
                {Object.entries(openingHours).map(([day, hours]) => (
                  <li key={day} className={styles.openingHoursItem}>
                    <span className={styles.openingHoursDay}>{day}</span>
                    <span className={styles.openingHoursTime}>
                      {hours.open === 'Closed'
                        ? 'Closed'
                        : `${convertTo12Hour(hours.open)} - ${convertTo12Hour(
                            hours.close
                          )}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Column 2: Quick Links (already reordered) */}
          <div className={styles.footerColumn}>
            <h4 className={styles.widgetTitle}>Quick Links</h4>
            <ul className={styles.quickLinksList}>
              <li className={styles.quickLinksItem}>
                <Link href="/contact" className={styles.quickLinksLink}>
                  Contact
                </Link>
              </li>
              <li className={styles.quickLinksItem}>
                <Link href="/gallery" className={styles.quickLinksLink}>
                  Gallery
                </Link>
              </li>
              <li className={styles.quickLinksItem}>
                <Link href="/chef" className={styles.quickLinksLink}>
                  Chef Crosby
                </Link>
              </li>
              <li className={styles.quickLinksItem}>
                <Link href="/blog" className={styles.quickLinksLink}>
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact Info + "Sponsored by" */}
          <div className={styles.footerColumn}>
            <h4 className={styles.widgetTitle}>Contact Info</h4>
            <ul className={styles.contactWidget}>
              <li className={styles.contactItem}>
                <FaMapMarkerAlt className={styles.contactIcon} />
                <div className={styles.contactContent}>
                  20025 Mount Aetna Road, Hagerstown, MD 21742
                </div>
              </li>
              <li className={styles.contactItem}>
                <FaPhone className={styles.contactIcon} />
                <div className={styles.contactContent}>
                  <a href="tel:2403132819" className={styles.contactLink}>
                    (240) 313-2819
                  </a>
                </div>
              </li>
              <li className={styles.contactItem}>
                <FaEnvelope className={styles.contactIcon} />
                <div className={styles.contactContent}>
                  <a
                    href="mailto:19thholeblackrock@gmail.com"
                    className={`${styles.contactLink} ${styles.emailLink}`}
                  >
                    19thholeblackrock@gmail.com
                  </a>
                </div>
              </li>
            </ul>

            {/* Sponsored By in its own container */}
            <div className={styles.sponsoredBy}>
              <h4 className={styles.widgetTitle}>Sponsored by</h4>
              <a
                href="https://harambee54.com"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.sponsorLogoLink}
              >
                <Image
                  src="/images/harambee54-logo.png"
                  alt="Harambee54"
                  width={120}
                  height={40}
                />
              </a>
            </div>
          </div>

          {/* Column 4: Newsletter Subscription */}
          <div className={styles.footerColumn}>
            <h4 className={styles.widgetTitle}>Newsletter</h4>
            <p>
              Join our subscribers list to get the latest news and special offers.
            </p>
            <form action="#" className={styles.newsletterForm}>
              <input
                type="email"
                placeholder="Your Email"
                className={`${styles.newsletterInput} form-control mb-2`}
                name="email"
                aria-label="Your Email"
                required
              />
              <div className={styles.newsletterControls}>
                <div className={styles.checkboxWrapper}>
                  <input
                    type="checkbox"
                    className={`${styles.formCheckInput} form-check-input me-2`}
                    id="privacy"
                    name="privacy"
                    required
                  />
                  <label
                    className={`${styles.formCheckLabel} form-check-label small-checkbox-label`}
                    htmlFor="privacy"
                  >
                    I agree to the Privacy Policy
                  </label>
                </div>
                <button
                  className={`${styles.btnSmall} btn btn-primary`}
                  type="submit"
                  aria-label="Subscribe"
                >
                  Subscribe
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className={styles.footerBottom}>
          <ul className={styles.footerSocial}>
            <li>
              <a
                href="https://www.facebook.com/people/19th-Hole-at-Black-Rock/61558594058002/?ref=embed_page&checkpoint_src=any"
                aria-label="Facebook"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.footerSocialLink}
              >
                <FaFacebookF />
              </a>
            </li>
            <li>
              <a
                href="https://twitter.com"
                aria-label="Twitter"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.footerSocialLink}
              >
                <FaTwitter />
              </a>
            </li>
            <li>
              <a
                href="https://www.instagram.com/19holeblackrock/"
                aria-label="Instagram"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.footerSocialLink}
              >
                <FaInstagram />
              </a>
            </li>
            <li>
              <a
                href="https://www.tiktok.com"
                aria-label="TikTok"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.footerSocialLink}
              >
                <FaTiktok />
              </a>
            </li>
            <li>
              <a
                href="https://www.youtube.com"
                aria-label="YouTube"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.footerSocialLink}
              >
                <FaYoutube />
              </a>
            </li>
            <li>
              <a
                href="https://www.linkedin.com"
                aria-label="LinkedIn"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.footerSocialLink}
              >
                <FaLinkedinIn />
              </a>
            </li>
          </ul>
          <p className={styles.footerBottomText}>
            © {new Date().getFullYear()} The 19th Hole Restaurant and Bar at Black Rock.
            All Rights Reserved.
          </p>
          <p className={styles.footerDevelopedBy}>
            Developed by{' '}
            <a
              href="https://www.kimtechsolutions.com"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.footerDevelopedByLink}
            >
              Kimtech Solutions
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

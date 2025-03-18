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

const fullDayMapping: { [key: string]: string } = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};

const Footer: React.FC = () => {
  const { openingHours } = useOpeningHours();

  return (
    <footer id="footer" className={styles.footer}>
      <div className={styles.footerContainer}>
        <div className={styles.footerGrid}>
          {/* Column 1: Explore More Info (Logo and Opening Hours) */}
          <div className={styles.footerColumn}>
            <h4 className={styles.columnTitle}>Explore More Info</h4>
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
                    <span
                      className={styles.openingHoursDay}
                      data-full={fullDayMapping[day] || day}
                    >
                      {day}
                    </span>
                    <span className={styles.openingHoursTime}>
                      {hours.open === 'Closed'
                        ? 'Closed'
                        : `${convertTo12Hour(hours.open)} - ${convertTo12Hour(hours.close)}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Column 2: Quick Links */}
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

          {/* Column 3: Contact Info, Sponsored by, and Newsletter */}
          <div className={styles.footerColumn}>
            <h4 className={styles.widgetTitle}>Contact Info</h4>
            <ul className={styles.contactWidget}>
              <li className={styles.contactItem}>
                <div className={styles.contactContent}>
                  <div>2025 Mount Aetna Road,</div>
                  <div>Hagerstown, MD 21742</div>
                </div>
                <FaMapMarkerAlt className={styles.contactIcon} />
              </li>
              <li className={styles.contactItem}>
                <div className={styles.contactContent}>
                  <a href="tel:2403132819" className={styles.contactLink}>
                    (240) 313-2819
                  </a>
                </div>
                <FaPhone className={styles.contactIcon} />
              </li>
              <li className={styles.contactItem}>
                <div className={styles.contactContent}>
                  <a
                    href="mailto:19thholeblackrock@gmail.com"
                    className={`${styles.contactLink} ${styles.emailLink}`}
                  >
                    19thholeblackrock@gmail.com
                  </a>
                </div>
                <FaEnvelope className={styles.contactIcon} />
              </li>
            </ul>
            <div className={styles.sponsoredBy}>
              <h4 className={styles.widgetTitle}>Sponsored by</h4>
              <Link
                href="https://harambee54.com"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.sponsorLogoLink}
              >
                <span className={styles.sponsorText}>Harambee54</span>
              </Link>
            </div>
            <div className={styles.newsletterForm}>
              <h4 className={styles.widgetTitle}>Newsletter</h4>
              <p>
                Join our subscribers list to get the latest news and special offers.
              </p>
              <form action="#">
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
          <div className={styles.footerSeparator}></div>
          <p className={styles.footerBottomText}>
            © {new Date().getFullYear()} The 19th Hole Restaurant and Bar at Black Rock.
          </p>
          <br />
          <p className={styles.footerBottomText}>
            All Rights Reserved.
          </p>
          <br />
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
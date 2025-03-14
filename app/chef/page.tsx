// File: pages/chef/Chef.tsx
'use client';

import React from 'react';
import styles from './chef.module.css';
import Image from 'next/image';
import chefCrosby from '../../public/assets/img/chef-crosby.jpg'; // Adjust the path based on your project structure

const Chef: React.FC = () => {
  return (
    <div className={styles.chefContainer}>
      <Image
        src={chefCrosby}
        alt="Chef Crosby"
        className={styles.chefImage}
        width={500}
        height={600}
        placeholder="blur"
      />
      <div className={styles.chefContent}>
        <h1 className={styles.chefName}>Chef Crosby</h1>
        <h2 className={styles.chefTitle}>Executive Chef</h2>
        <p className={styles.chefBio}>
          Chef Crosby is renowned as one of the finest culinary talents in Western Maryland and the DC area. With over 15 years of experience in high-end kitchens, Chef Crosby brings a passion for innovative cuisine and exceptional dining experiences. Her dedication to sourcing the freshest local ingredients and her mastery of diverse culinary techniques have earned her accolades and a loyal following of food enthusiasts.
        </p>
        <h3 className={styles.learnMoreTitle}>Learn More About Chef Crosby</h3>
        <ul className={styles.chefAchievements}>
          <li>
            <a 
              href="https://primetimeforwomen.org/october-carol-munyua-crosby/" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Featured on Prime Time for Women, October 2022
            </a>
          </li>
          <li>
            <a 
              href="https://primetimeforwomen.org/celebrating-one-of-our-own-chef-carolyne-crosby/" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Featured on Prime Time for Women, April 2024
            </a>
          </li>
        </ul>
        <h3 className={styles.chefPhilosophyTitle}>Culinary Philosophy</h3>
        <p className={styles.chefPhilosophy}>
          "Cooking is an art form that combines passion, creativity, and precision. I believe in creating dishes that not only delight the palate but also tell a story. My goal is to provide an unforgettable dining experience by blending traditional flavors with modern techniques."
        </p>
      </div>
    </div>
  );
};

export default Chef;

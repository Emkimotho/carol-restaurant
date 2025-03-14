// File: components/FloatingCartBar/FloatingCartBar.tsx
'use client';

import React, { useContext, useEffect, useState } from 'react';
import styles from './FloatingCartBar.module.css';
import { CartContext } from '@/contexts/CartContext';

const FloatingCartBar: React.FC = () => {
  const { cartItems, getTotalPrice, openSidebarCart } = useContext(CartContext)!;
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const footer = document.getElementById('footer');
      if (footer) {
        const footerTop = footer.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
        setIsFooterVisible(footerTop < windowHeight);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCartClick = () => {
    openSidebarCart();
  };

  if (cartItems.length === 0) {
    return null;
  }

  const totalItems = cartItems.reduce((total: number, item) => total + item.quantity, 0);
  const totalPrice = getTotalPrice().toFixed(2);

  return (
    <div
      className={`
        ${styles.floatingCartBar}
        ${isFooterVisible ? styles.aboveFooter : ''}
        ${isHidden ? styles.hidden : ''}
      `}
      onClick={handleCartClick}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => {
        if (e.key === 'Enter') handleCartClick();
      }}
      aria-label="View Cart"
    >
      <div className={styles.cartInfo}>
        <span>
          {totalItems} item{totalItems > 1 ? 's' : ''}
        </span>
        <span>Total: ${totalPrice}</span>
      </div>
      <button className={styles.btn}>View Cart</button>
    </div>
  );
};

export default FloatingCartBar;

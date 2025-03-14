// File: components/Cart/Cart.tsx
'use client';

import React, { useContext, useState } from 'react';
import { CartContext } from '@/contexts/CartContext';
import { FaShoppingCart } from 'react-icons/fa';
import EditItemModal from '../EditItemModal/EditItemModal';
import styles from './Cart.module.css';
import { useRouter } from 'next/navigation';

const Cart: React.FC = () => {
  const { cartItems, updateCartItem, getTotalPrice, openSidebarCart } = useContext(CartContext)!;
  const [editingItem, setEditingItem] = useState<any>(null);
  const router = useRouter();

  const handleCheckout = () => {
    router.push('/checkout');
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
  };

  const closeEditModal = () => {
    setEditingItem(null);
  };

  const handleUpdateCartItem = (updatedItem: any) => {
    updateCartItem(updatedItem);
    closeEditModal();
  };

  const totalItems = cartItems.reduce((total: number, item: any) => total + item.quantity, 0);
  const totalPrice = getTotalPrice().toFixed(2);

  return (
    <>
      {/* Cart Icon */}
      <div
        className={styles.cartIconContainer}
        onClick={openSidebarCart}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => {
          if (e.key === 'Enter') openSidebarCart();
        }}
        aria-label="Open Cart"
      >
        <FaShoppingCart className={styles.cartIcon} />
        {totalItems > 0 && <span className={styles.cartCount}>{totalItems}</span>}
        <span className={styles.cartTotal}>(${totalPrice})</span>
      </div>

      {/* Edit Item Modal */}
      {editingItem && (
        <EditItemModal
          item={editingItem}
          onClose={closeEditModal}
          updateCartItem={handleUpdateCartItem}
        />
      )}
    </>
  );
};

export default Cart;

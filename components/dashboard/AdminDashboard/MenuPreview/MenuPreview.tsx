// File: components/dashboard/AdminDashboard/MenuPreview/MenuPreview.tsx
'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import Image from 'next/image';
import styles from './MenuPreview.module.css';
import { toast } from 'react-toastify';
import { getCloudinaryImageUrl } from '@/lib/cloudinary-client';

interface PreviewItem {
  id: number;
  title: string;
  description: string | null;
  imageUrl?: string;            // legacy/public folder URL
  cloudinaryPublicId?: string;  // new Cloudinary ID
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

const MAX_ITEMS = 3;

const MenuPreviewAdmin: React.FC = () => {
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch all existing preview items
  const fetchItems = async () => {
    try {
      const res = await fetch('/api/menupreview');
      if (!res.ok) throw new Error('Failed to fetch preview items');
      const data: PreviewItem[] = await res.json();
      setItems(data);
    } catch (error) {
      console.error('[MenuPreviewAdmin] Error fetching items:', error);
      toast.error('Could not load preview items.');
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Handle form submission (new preview item)
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // guard against over-add
    if (items.length >= MAX_ITEMS) {
      toast.error(`You can only have up to ${MAX_ITEMS} preview items. Delete one to add another.`);
      return;
    }

    if (!file) {
      toast.error('Please select an image to upload.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('displayOrder', displayOrder.toString());

    try {
      const res = await fetch('/api/menupreview', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        toast.success('Menu preview item uploaded!');
        setFile(null);
        setTitle('');
        setDescription('');
        setDisplayOrder(0);
        fetchItems();
      } else {
        const err = await res.json();
        toast.error(`Failed to upload: ${err.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[MenuPreviewAdmin] Upload error:', error);
      toast.error('An error occurred during upload.');
    } finally {
      setLoading(false);
    }
  };

  // Handle deletion
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this preview item?')) return;
    try {
      const res = await fetch(`/api/menupreview?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Deleted successfully!');
        fetchItems();
      } else {
        toast.error('Failed to delete item.');
      }
    } catch (error) {
      console.error('[MenuPreviewAdmin] Delete error:', error);
      toast.error('An error occurred during deletion.');
    }
  };

  const atLimit = items.length >= MAX_ITEMS;

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Menu Preview Admin</h2>

      {atLimit && (
        <div className={styles.limitBanner}>
          {`${items.length} of ${MAX_ITEMS} slots used. Delete an item to add another.`}
        </div>
      )}

      <form className={styles.form} onSubmit={handleSubmit}>
        <fieldset disabled={atLimit || loading} className={styles.fieldset}>
          <div className={styles.field}>
            <label>Upload Image:</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  setFile(e.target.files[0]);
                }
              }}
              required
            />
          </div>

          <div className={styles.field}>
            <label>Title:</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Menu item name"
              required
            />
          </div>

          <div className={styles.field}>
            <label>Description:</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description (optional)"
            />
          </div>

          <div className={styles.field}>
            <label>Display Order:</label>
            <input
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10))}
              min={0}
              required
            />
          </div>

          <button type="submit" className="btn">
            {loading ? 'Uploading…' : 'Upload Preview Item'}
          </button>
        </fieldset>
      </form>

      <hr className={styles.divider} />

      <div className={styles.itemList}>
        {items.map((item) => {
          const src = item.cloudinaryPublicId
            ? getCloudinaryImageUrl(item.cloudinaryPublicId, 300, 300)
            : item.imageUrl || '/images/placeholder.png';

          return (
            <div key={item.id} className={styles.itemCard}>
              <div
                style={{
                  position: 'relative',
                  width: 300,
                  height: 300,
                  margin: '0 auto',
                }}
              >
                <Image
                  src={src}
                  alt={item.title}
                  fill
                  style={{ objectFit: 'cover', borderRadius: '0.5rem' }}
                  unoptimized
                />
              </div>
              <div className={styles.meta}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <small>Order: {item.displayOrder}</small>
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                className={`btn btn-secondary ${styles.deleteButton}`}
              >
                Delete
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MenuPreviewAdmin;

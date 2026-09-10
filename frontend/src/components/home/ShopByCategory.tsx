'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { imageUrl } from '@/lib/format';

interface CategoryItem {
  id: string;
  name: string;
  sub: string;
  image: string;
  href: string;
  active?: boolean;
}

const CATEGORIES: CategoryItem[] = [
  {
    id: 'ultrabook',
    name: 'Ultrabooks',
    sub: 'Lightweight & Thin',
    image: 'assets/images/cat-ultrabooks.jpg',
    href: '/buy?category=Ultrabook',
  },
  {
    id: 'gaming',
    name: 'Gaming Laptops',
    sub: 'High Performance',
    image: 'assets/images/cat-gaming.jpg',
    href: '/buy?category=Gaming',
    active: true,
  },
  {
    id: 'business',
    name: 'Business Laptops',
    sub: 'Power & Productivity',
    image: 'assets/images/cat-business.jpg',
    href: '/buy?category=Business',
  },
  {
    id: '2in1',
    name: '2-in-1 Laptops',
    sub: 'Versatile & Flexible',
    image: 'assets/images/cat-2in1.jpg',
    href: '/buy?category=2in1',
  },
  {
    id: 'student',
    name: 'Student Laptops',
    sub: 'Study Smart',
    image: 'assets/images/cat-student.jpg',
    href: '/buy?category=Student',
  },
  {
    id: 'workstations',
    name: 'Workstations',
    sub: 'Built for Professionals',
    image: 'assets/images/cat-workstations.jpg',
    href: '/parts?category=Desktop',
  },
];

export function ShopByCategory() {
  const railRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string>('gaming');

  const scrollRight = () => {
    if (railRef.current) {
      railRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  return (
    <section className="section-shop-category" id="shop-by-category">
      <div className="container">
        <div className="category-header-wrap">
          <h2 className="category-section-title">SHOP BY CATEGORY</h2>
          <div className="category-title-bar" />
        </div>

        <div className="category-rail-wrapper">
          <div className="category-cards-grid" id="category-cards-grid" ref={railRef}>
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href={cat.href}
                className={`category-card${activeId === cat.id ? ' active' : ''}`}
                onMouseEnter={() => setActiveId(cat.id)}
              >
                <div className="cat-img-box">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl(cat.image)} alt={cat.name} loading="lazy" />
                </div>
                <h3 className="cat-name">{cat.name}</h3>
                <p className="cat-sub">{cat.sub}</p>
              </Link>
            ))}
          </div>

          <button
            type="button"
            className="category-nav-next"
            aria-label="Next categories"
            onClick={scrollRight}
          >
            <span className="icon">chevron_right</span>
          </button>
        </div>
      </div>
    </section>
  );
}

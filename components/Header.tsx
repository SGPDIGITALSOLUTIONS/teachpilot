'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

interface HeaderProps {
  showLogout?: boolean;
}

export default function Header({ showLogout = false }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem('teachpilot_authenticated');
    router.push('/');
  };

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/subjects', label: 'Subjects' },
    { href: '/revision', label: 'Revision' },
    { href: '/exams', label: 'Exams' },
    { href: '/calendar', label: 'Calendar' },
    { href: '/settings', label: 'Settings' },
  ];

  return (
    <header className="app-header">
      <div className="container" style={{ maxWidth: '1100px', width: '92vw', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1 }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <Image
              src="/logo.png"
              alt="TeachPilot Logo"
              width={200}
              height={200}
              style={{ objectFit: 'contain' }}
              priority
            />
          </Link>
          <nav>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={pathname === link.href ? 'active' : ''}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        {showLogout && (
          <button onClick={handleLogout} className="btn btn-quiet">
            Logout
          </button>
        )}
      </div>
    </header>
  );
}


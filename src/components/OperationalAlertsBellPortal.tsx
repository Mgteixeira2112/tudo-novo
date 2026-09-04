import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getSupabaseAuthUser } from '../services/supabase.ts';
import { OperationalAlertsBell } from './OperationalAlertsBell.tsx';

export const OperationalAlertsBellPortal: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [impersonating, setImpersonating] = useState(false);

  useEffect(() => {
    let active = true;
    getSupabaseAuthUser()
      .then(user => {
        if (active) setUserId(user?.id || null);
      })
      .catch(() => {
        if (active) setUserId(null);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const resolveTarget = () => {
      const profileButton = document.getElementById('btn-user-profile-menu');
      const controls = profileButton?.parentElement?.parentElement || null;
      setTarget(controls as HTMLElement | null);
      setImpersonating(Boolean(document.getElementById('btn-exit-impersonation')));
    };

    resolveTarget();
    const timer = window.setInterval(resolveTarget, 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!userId || !target || impersonating) return null;
  return createPortal(<OperationalAlertsBell userId={userId} />, target);
};

/**
 * User Dashboard Redirect
 * Redirect USER role to their dashboard
 */

import { redirect } from 'next/navigation';

export default function UserPage() {
  redirect('/user/dashboard');
}

import AccountGate from '@/components/AccountGate';
export default function TeamsLayout({ children }: { children: React.ReactNode }) {
  return <AccountGate enterprise>{children}</AccountGate>;
}

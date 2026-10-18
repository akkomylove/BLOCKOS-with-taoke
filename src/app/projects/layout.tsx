import AccountGate from '@/components/AccountGate';
export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return <AccountGate enterprise>{children}</AccountGate>;
}

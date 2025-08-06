import AccountsPatternsManager from "@/components/accounts-patterns-manager"
import ModernNav from "@/components/modern-nav"
export default function AccountsPage() {
  return <div className="flex flex-col gap-4">
    <div>
        <ModernNav />
    </div>
    <AccountsPatternsManager />
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Accounts</h1>
      <p className="text-sm text-gray-500">
        Manage your payment accounts and extraction patterns here.
      </p>
    </div>
  </div>
}
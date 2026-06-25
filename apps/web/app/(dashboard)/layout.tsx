// @ts-nocheck
import { AuthGuard } from "@/modules/auth/ui/components/auth-guard";
import { ErrorBoundary, SentryUserSync } from "@/components/error-boundary";

const Layout = ({ children }: { children: React.ReactNode }) => {
    return (
        <AuthGuard>
            {/* Keeps Sentry user context in sync with Clerk — renders nothing */}
            <SentryUserSync />
            <ErrorBoundary label="Dashboard">
                {children}
            </ErrorBoundary>
        </AuthGuard>
    );
};

export default Layout;
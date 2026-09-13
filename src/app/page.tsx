import { ClientAppShell } from '@/components/ui/app-shell';
import ClientHome from '@/app/client/home/page';

export default function HomePage() {
	return (
		<ClientAppShell>
			<ClientHome />
		</ClientAppShell>
	);
}

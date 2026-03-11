import { cookies } from 'next/headers';
import App from '../App';

export default async function Page() {
    const hasSessionCookie = Boolean((await cookies()).get('predi_session')?.value);
    return <App initialView={hasSessionCookie ? 'app' : 'landing'} />;
}

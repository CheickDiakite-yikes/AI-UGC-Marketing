
'use client';

import React, { useEffect, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { login } from '../actions/authActions';
import Link from 'next/link';

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full bg-neo-black text-white px-8 py-4 font-black uppercase tracking-wider text-xl hover:bg-neo-blue hover:text-black border-4 border-black shadow-neo-sm transform active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {pending ? 'Initializing...' : 'Access Terminal'}
        </button>
    );
}

export default function LoginPage() {
    const [state, formAction] = useActionState(login, null);
    const router = useRouter();

    useEffect(() => {
        if (state?.success) {
            router.push('/');
        }
    }, [state?.success, router]);

    return (
        <div className="min-h-screen bg-neo-yellow flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-neo-pink rounded-full blur-[100px] opacity-20 animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-neo-lime rounded-full blur-[100px] opacity-20 animate-pulse delay-1000"></div>

            <div className="w-full max-w-md bg-white border-4 border-black shadow-neo z-10 p-8 md:p-12 relative animate-slide-up">

                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-block bg-black text-white px-3 py-1 text-xs font-bold uppercase mb-4 transform -rotate-2">
                        Welcome Back
                    </div>
                    <Link href="/about" className="inline-block hover:opacity-80 transition-opacity">
                        <h1 className="text-4xl md:text-5xl font-display font-black leading-none mb-2 tracking-tight">
                            PREDI<span className="text-neo-pink">.AI</span>
                        </h1>
                    </Link>
                    <p className="text-gray-500 font-medium">Enter your credentials to proceed.</p>
                </div>

                {/* Form */}
                <form action={formAction} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-black uppercase tracking-wide">Email</label>
                        <input
                            type="email"
                            name="email"
                            required
                            placeholder="agent@company.com"
                            className="w-full bg-gray-50 border-4 border-black p-4 font-bold focus:outline-none focus:bg-neo-pink/10 focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-black uppercase tracking-wide">Password</label>
                        <input
                            type="password"
                            name="password"
                            required
                            placeholder="••••••••"
                            className="w-full bg-gray-50 border-4 border-black p-4 font-bold focus:outline-none focus:bg-neo-pink/10 focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                        />
                    </div>

                    {state?.error && (
                        <div className="bg-red-100 border-2 border-red-500 text-red-700 p-3 font-bold text-sm text-center animate-shake">
                            ⚠️ {state.error}
                        </div>
                    )}

                    <SubmitButton />
                </form>

                {/* Footer */}
                <div className="mt-8 text-center text-sm font-bold">
                    <span className="text-gray-400">New User?</span>{' '}
                    <Link href="/signup" className="underline decoration-4 decoration-neo-lime hover:text-neo-pink transition-colors">
                        Sign Up
                    </Link>
                </div>
            </div>
        </div>
    );
}

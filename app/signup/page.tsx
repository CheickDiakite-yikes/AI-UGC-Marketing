
'use client';

import React, { useEffect, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { signup } from '../actions/authActions';
import Link from 'next/link';

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className={`w-full text-white px-8 py-4 font-black uppercase tracking-wider text-xl border-4 border-black shadow-neo-sm transform active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed
        ${pending ? 'bg-gray-400' : 'bg-neo-lime hover:bg-neo-pink hover:text-black text-black'}`}
        >
            {pending ? 'Creating Account...' : 'Launch Application'}
        </button>
    );
}

export default function SignupPage() {
    const [state, formAction] = useActionState(signup, null);
    const router = useRouter();

    useEffect(() => {
        if (state?.success) {
            router.push('/');
        }
    }, [state?.success, router]);

    return (
        <div className="min-h-screen bg-white flex flex-col md:flex-row">

            {/* Visual Side (Desktop) */}
            <div className="hidden md:flex w-1/2 bg-neo-black items-center justify-center p-12 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                <div className="z-10 text-white max-w-lg">
                    <h2 className="text-7xl font-display font-black leading-tight mb-8">
                        The <span className="text-transparent bg-clip-text bg-gradient-to-r from-neo-lime to-neo-cyan">Marketing OS</span><br />of the Future.
                    </h2>
                    <div className="space-y-6 text-lg font-medium opacity-80">
                        <div className="flex items-center gap-4">
                            <span className="bg-neo-pink text-black px-2 py-1 font-black text-xs">01</span>
                            <p>Autonomous AI Campaigns</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="bg-neo-cyan text-black px-2 py-1 font-black text-xs">02</span>
                            <p>Cinematic Video Generation</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="bg-neo-lime text-black px-2 py-1 font-black text-xs">03</span>
                            <p>Consistent Brand Memory</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Side */}
            <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 relative">
                <div className="w-full max-w-lg space-y-8 animate-slide-up delay-100">

                    <div className="text-left">
                        <h1 className="text-4xl font-display font-black mb-2">Initialize Account</h1>
                        <p className="text-gray-500 font-medium">Join the Swarm. Build faster.</p>
                    </div>

                    <form action={formAction} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1">
                                <label className="text-xs font-black uppercase tracking-wide">Full Name</label>
                                <input type="text" name="name" required className="auth-input" placeholder="Elon Musk" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black uppercase tracking-wide">Company</label>
                                <input type="text" name="company" required className="auth-input" placeholder="SpaceX" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-black uppercase tracking-wide">Email Address</label>
                            <input type="email" name="email" required className="auth-input" placeholder="elon@mars.com" />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-black uppercase tracking-wide">Password</label>
                            <input type="password" name="password" required className="auth-input" placeholder="••••••••••••" minLength={8} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1">
                                <label className="text-xs font-black uppercase tracking-wide">Job Title</label>
                                <input type="text" name="jobTitle" className="auth-input" placeholder="Technoking" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black uppercase tracking-wide">Found via?</label>
                                <select name="referralSource" className="auth-input bg-white h-[52px]">
                                    <option value="Twitter">Twitter / X</option>
                                    <option value="LinkedIn">LinkedIn</option>
                                    <option value="Google">Google Search</option>
                                    <option value="Friend">Friend / Colleague</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        {state?.error && (
                            <div className="bg-red-100 border-2 border-red-500 text-red-700 p-3 font-bold text-sm text-center animate-shake">
                                ⚠️ {state.error}
                            </div>
                        )}

                        <div className="pt-4">
                            <SubmitButton />
                        </div>
                    </form>

                    <div className="text-center font-bold text-sm">
                        Already have an account?{' '}
                        <Link href="/login" className="underline decoration-4 decoration-neo-pink hover:text-neo-pink transition-colors">
                            Access Terminal
                        </Link>
                    </div>

                </div>
            </div>
        </div>
    );
}

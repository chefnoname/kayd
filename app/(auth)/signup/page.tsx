"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Image from "next/image";
import styles from "../login/login.module.css";

function SignupForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();

    const prefillEmail = searchParams.get("email") ?? "";

    const [name, setName] = useState("");
    const [email, setEmail] = useState(prefillEmail);
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const nameRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (prefillEmail) {
            nameRef.current?.focus();
        }
    }, [prefillEmail]);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        const trimmedName = name.trim();
        const trimmedEmail = email.trim().toLowerCase();

        if (!trimmedName) return setError("Name is required.");
        if (password.length < 8)
            return setError("Password must be at least 8 characters.");

        setLoading(true);

        const siteUrl =
            process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

        const { error: signUpError } = await supabase.auth.signUp({
            email: trimmedEmail,
            password,
            options: {
                // Public signup → admin role for their own org
                data: { name: trimmedName, role: "admin" },
                emailRedirectTo: `${siteUrl}/auth/callback?next=/dashboard`,
            },
        });

        setLoading(false);

        if (signUpError) {
            setError(signUpError.message);
            return;
        }

        router.push("/dashboard?verify_email=true");
        router.refresh();
    }

    return (
        <div className={styles.shell}>
            <Card className={styles.card}>
                <CardHeader>
                    <Image
                        src="/kayd.png"
                        alt="Kayd logo"
                        width={250}
                        height={0}
                        className={styles.logo}
                    />
                </CardHeader>
                <CardContent>
                    <form onSubmit={onSubmit} className={styles.form}>
                        <div className={styles.field}>
                            <Label htmlFor="name">Full name</Label>
                            <Input
                                id="name"
                                ref={nameRef}
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className={styles.field}>
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className={styles.field}>
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                minLength={8}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <Button type="submit" disabled={loading} className={styles.submit}>
                            {loading ? "Creating account…" : "Create account"}
                        </Button>

                        <p style={{ fontSize: 14, textAlign: "center" }}>
                            Already have an account?{" "}
                            <Link href={`/login${email ? `?email=${encodeURIComponent(email)}` : ""}`}>
                                <strong>Sign in</strong>
                            </Link>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={null}>
            <SignupForm />
        </Suspense>
    );
}

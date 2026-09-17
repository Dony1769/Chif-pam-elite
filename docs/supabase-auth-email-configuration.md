# Configuration des emails Supabase Auth

## URL de redirection

Le code utilise `NEXT_PUBLIC_SITE_URL` pour construire le callback de confirmation :

- Local : `http://localhost:3000`
- Production Vercel : `https://www.chifpam.com`
- Callback : `/auth/callback`

La valeur locale est déjà présente dans `.env.local`. Ajouter la même variable dans Vercel pour les environnements `Production` et, si nécessaire, `Preview` avec la valeur correspondant à l'environnement.

Dans Supabase, ouvrir **Authentication > URL Configuration** et renseigner :

- **Site URL** : `https://www.chifpam.com`
- **Redirect URLs** : `https://www.chifpam.com/*`
- Pour les tests locaux, ajouter aussi `http://localhost:3000/**`.

Le MCP Supabase disponible dans cet environnement permet de consulter l'URL du projet et les advisories, mais ne permet pas de modifier les paramètres Auth ni les templates d'email. Ces deux réglages doivent donc être appliqués dans le dashboard Supabase.

## Template actuellement utilisé

Le projet appelle `supabase.auth.updateUser({ email }, { emailRedirectTo })` dans le composant de vérification d'email. Cela déclenche le template **Change Email Address**.

Le endpoint d'inscription utilise `auth.admin.createUser` avec `email_confirm: false`, sans envoi automatique d'un template de confirmation. Aucun appel à `resetPasswordForEmail`, `inviteUserByEmail`, `signInWithOtp` ou `resend` n'est présent dans le code actuel. Les templates **Confirm signup**, **Reset Password**, **Magic Link** et **Invite User** ne sont donc pas utilisés par ce flux aujourd'hui.

## Template Change Email Address

Dans **Authentication > Email Templates > Change Email Address**, remplacer le contenu HTML par celui-ci. Le sujet recommandé est : `Confirmez votre nouvelle adresse email - Chif Pam`.

```html
<!doctype html>
<html lang="fr">
  <body style="margin:0;background:#07111f;color:#e5e7eb;font-family:Arial,Helvetica,sans-serif;">
    <div style="width:100%;padding:32px 12px;background:#07111f;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;background:#0f1d2e;border:1px solid #1f3b4d;border-radius:12px;">
        <tr>
          <td style="padding:30px 32px 18px;text-align:center;">
            <div style="font-size:24px;font-weight:700;letter-spacing:1px;color:#ffffff;">
              CHIF<span style="color:#10b981;">PAM</span>
            </div>
            <div style="margin-top:8px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#8ca3b5;">Sécurité du compte</div>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 32px 32px;">
            <h1 style="margin:0 0 18px;font-size:24px;line-height:1.3;color:#ffffff;">Confirmez votre email</h1>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#cbd5e1;">
              Une demande de modification d'adresse email a été effectuée pour votre compte Chif Pam.
            </p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#cbd5e1;">
              Pour protéger votre compte, confirmez cette nouvelle adresse en cliquant sur le bouton ci-dessous.
            </p>
            <div style="text-align:center;margin:28px 0;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 24px;background:#10b981;color:#052e24;text-decoration:none;font-size:15px;font-weight:700;border-radius:8px;">
                Confirmer mon email
              </a>
            </div>
            <p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:#94a3b8;">
              Ce message est envoyé pour sécuriser votre compte et vérifier que cette adresse vous appartient.
            </p>
            <p style="margin:0;font-size:13px;line-height:1.6;color:#94a3b8;">
              Si vous n'êtes pas à l'origine de cette demande, ignorez cet email. Votre adresse ne sera pas modifiée sans confirmation.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 32px;border-top:1px solid #1f3b4d;text-align:center;">
            <p style="margin:0;font-size:12px;color:#64748b;">Chif Pam - Votre compte, votre sécurité.</p>
          </td>
        </tr>
      </table>
    </div>
  </body>
</html>
```

Après collage, utiliser **Send test email** dans le dashboard puis vérifier le rendu sur mobile et dans Gmail/Outlook. Ne pas remplacer `{{ .ConfirmationURL }}` : Supabase y injecte le lien signé.

## Templates futurs

Si un reset de mot de passe est ajouté, il faudra aussi personnaliser **Reset Password** et appeler l'API avec `redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`` (ou son équivalent client via `appUrl`). Le callback devra rester présent dans les **Redirect URLs** Supabase.

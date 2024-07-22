import React, { useState, useEffect } from 'react';
import { googleLogout, useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import io from 'socket.io-client';
import { Route, Routes } from 'react-router-dom';
import Home from './components/Home/Home';
import Navbar from './components/Navbar/Navbar';
import toast, { Toaster } from 'react-hot-toast';
import { JSEncrypt } from 'jsencrypt';

const socket = io('http://localhost:3000');

function generateKeyPair() {
  const crypt = new JSEncrypt({ default_key_size: 2048 });
  const publicKey = crypt.getPublicKey();
  const privateKey = crypt.getPrivateKey();
  localStorage.setItem('privateKey', btoa(privateKey));
  return { publicKey, privateKey };
}

function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [profile, setProfile] = useState(JSON.parse(localStorage.getItem('profile')) || null);
  const [emails, setEmails] = useState(null);

  const login = useGoogleLogin({
    onSuccess: (res) => {
      localStorage.setItem('user', JSON.stringify(res));
      setUser(res);
    },
    onError: (error) => console.log('Login Failed:', error),
    scope: 'email profile https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email openid https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send',
  });

  const fetchProfile = async (accessToken) => {
    try {
      const response = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      localStorage.setItem('profile', JSON.stringify(response.data));
      setProfile(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchEmails = async (accessToken) => {
    try {
      const response = await axios.get('https://www.googleapis.com/gmail/v1/users/me/messages', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          q: 'subject:EEMAILER',
        },
      });

      const messagePromises = response.data.messages.map(async (message) => {
        const messageResponse = await axios.get(`https://www.googleapis.com/gmail/v1/users/me/messages/${message.id}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        return messageResponse.data;
      });

      const messages = await Promise.all(messagePromises);
      setEmails(messages);
    } catch (error) {
      console.error('Error fetching emails:', error);
    }
  };

  const sendEmail = async (email, title, body) => {
    if (!user) {
      console.error('User is not logged in');
      return;
    }

    const modifiedTitle = `EEMAILER - ${title}`;

    const message = `From: ${profile.email}\r\nTo: ${email}\r\nSubject: ${modifiedTitle}\r\n\r\n${body}`;
    const encodedMessage = btoa(message).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    try {
      await axios.post(
        'https://www.googleapis.com/gmail/v1/users/me/messages/send',
        {
          raw: encodedMessage,
        },
        {
          headers: {
            Authorization: `Bearer ${user.access_token}`,
          },
        }
      );
      console.log('Email sent successfully');
      socket.emit('email_sent',  { recipient: email, sender: profile.email });
    } catch (error) {
      console.error('Error sending email:', error);
    }
  };

  useEffect(() => {
    if (profile) {
      socket.emit('register', { user_email: profile.email });

      socket.on('account_found', (data) => {
        console.log('Account found:', data);
      });

      socket.on('account_not_found', async (data) => {
        console.log('Account not found:', data);

        const { publicKey, privateKey } = await generateKeyPair();

        localStorage.setItem('privateKey', privateKey);

        toast((t) => (
          <div>
            <p>Your account has been created. Please save your private key:</p>
            <textarea value={privateKey} readOnly style={{ width: "100%" }} />
            <div style={{ marginTop: "10px" }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(privateKey);
                  toast.dismiss(t.id);
                }}
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        ), {
          duration: Infinity
        });

        socket.emit('create_account', { user_email: profile.email, public_key: publicKey });
      });

      socket.on('account_created', (data) => {
        console.log('Account created:', data);
      });

      socket.on('error', (data) => {
        console.error('Error:', data);
      });

      socket.on('email_notification', ({ sender }) => {
        toast.success(`You have received a new email from ${sender}`, { duration: 10000 });
        if (user) {
          fetchEmails(user.access_token);
        }
      });

      return () => {
        socket.off('account_found');
        socket.off('account_not_found');
        socket.off('account_created');
        socket.off('error');
        socket.off('email_notification');
      };
    }
  }, [profile, user]);

  useEffect(() => {
    if (user) {
      fetchProfile(user.access_token);
      fetchEmails(user.access_token);
    }
  }, [user]);

  const logOut = () => {
    googleLogout();
    localStorage.removeItem('user');
    localStorage.removeItem('profile');
    localStorage.removeItem('privateKey');
    setUser(null);
    setProfile(null);
  };

  return (
    <>
      <Navbar login={login} logOut={logOut} profile={profile} />
      <Toaster />
      <Routes>
        <Route path="/" element={<Home profile={profile} emails={emails} sendEmail={sendEmail} />} />
      </Routes>
    </>
  );
}

export default App;

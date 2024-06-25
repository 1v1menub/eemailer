import { useState, useEffect } from 'react';
import { googleLogout, useGoogleLogin, hasGrantedAllScopesGoogle } from '@react-oauth/google';
import axios from 'axios';
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

function Home() {
  const [ user, setUser ] = useState(null);
  const [ profile, setProfile ] = useState(null);
  const [ emails, setEmails ] = useState(null);

  const login = useGoogleLogin({
      onSuccess: (res) => {
        setUser(res);
      },
      onError: (error) => console.log('Login Failed:', error),
      scope: 'email profile https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email openid https://www.googleapis.com/auth/gmail.modify',
  });

  const fetchProfile = async (accessToken) => {
    try {
        const response = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        setProfile(response.data);
      } 
      catch (error) {
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
                maxResults: 10,
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
      } 
      catch (error) {
          console.error('Error fetching emails:', error);
      }
  };

  useEffect(() => {
    if (user) {
      fetchProfile(user.access_token)
      fetchEmails(user.access_token)
    }
  }, [user]);

  useEffect(() => {
    if (profile) {
      socket.emit('register', { user_email: profile.email });

      socket.on('account_found', (data) => {
        console.log('Account found:', data);
      });

      socket.on('account_not_found', (data) => {
        console.log('Account not found:', data);
        const hardcodedPublicKey = 'hardcoded_public_key';
        socket.emit('create_account', { user_email: profile.email, public_key: hardcodedPublicKey });
      });

      socket.on('account_created', (data) => {
        console.log('Account created:', data);
      });

      socket.on('error', (data) => {
        console.error('Error:', data);
      });

      return () => {
        socket.off('account_found');
        socket.off('account_not_found');
        socket.off('account_created');
        socket.off('error');
      };
    }
  }, [profile, socket]);


  const logOut = () => {
      googleLogout();
      setUser(null) 
      setProfile(null);
  };

  return (
      <div>
          <h2>React Google Login</h2>
          {profile ? (
              <div>
                  <img src={profile.picture} alt="user image" />
                  <h3>User Logged in</h3>
                  <p>Name: {profile.name}</p>
                  <p>Email Address: {profile.email}</p>
                  <button onClick={logOut}>Log out</button>
              </div>
          ) : (
              <button onClick={login}>Sign in with Google 🚀 </button>
          )}
      </div>
  );
}
export default Home;
import {jwtDecode} from 'jwt-decode';

export function initializeGsi(setUser, setToken) {
  window.google.accounts.id.initialize({
    client_id: import.meta.env.VITE_CLIENT_ID,
    callback: (response) => handleCredentialResponse(response, setUser, setToken),
    scope: 'https://www.googleapis.com/auth/gmail.modify' 
  });   

  window.google.accounts.id.renderButton(
    document.getElementById('buttonDiv'),
    { theme: 'outline', size: 'large' }
  );

  window.google.accounts.id.prompt(); // Also display the One Tap dialog
}

function handleCredentialResponse(response, setUser, setToken) {
  console.log('Encoded JWT ID token: ' + response.credential);
  const decoded = jwtDecode(response.credential);
  console.log('Decoded JWT ID token: ', decoded);
  setUser(decoded);
  setToken(response.credential); // Use the response.credential directly for token
}

import React from 'react'
import "./Navbar.css"

function Navbar({login, logOut, profile}) {

  return (
      <div className='nav-cont'>
          <h2 className='nav-title'>EEMAILER</h2>
          {profile ? (
              <div className='user-info-cont'>
                  <p>{profile.email}</p>
                  <img className='user-img' src={profile.picture} alt="user image" />
                  <button className='login-button' onClick={logOut}>Log out</button>
              </div>
          ) : (
              <button className='login-button' onClick={login}>Log In </button>
          )}
      </div>
  );
}
export default Navbar;
import React from "react";
import InstagramIcon from "@mui/icons-material/Instagram";
import GitHubIcon from "@mui/icons-material/GitHub";
import TwitterIcon from "@mui/icons-material/Twitter";
import EmailIcon from "@mui/icons-material/Email";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import Fab from "@mui/material/Fab";

function Footer() {
  const currYear = new Date().getFullYear();
  return (
    <div className="footerContainer" id="contact-me">
      <footer>
        <div className="contact-me">
          <a href="https://github.com/shivansh-verma13">
            <Fab>
              <GitHubIcon />
            </Fab>
          </a>
          <a href="https://www.linkedin.com/in/shivansh-verma-650a92222/">
            <Fab>
              <LinkedInIcon />
            </Fab>
          </a>
          <a href="https://www.instagram.com/_shivansh.v/">
            <Fab>
              <InstagramIcon />
            </Fab>
          </a>
          <a href="https://twitter.com/VerShivu">
            <Fab>
              <TwitterIcon />
            </Fab>
          </a>
          <a href="mailto:shivansh.vrma.10@gmail.com">
            <Fab>
              <EmailIcon />
            </Fab>
          </a>
        </div>
        <p>Made By 💓 By &copy; Shivansh Verma Copyright {currYear}</p>
      </footer>
    </div>
  );
}

export default Footer;

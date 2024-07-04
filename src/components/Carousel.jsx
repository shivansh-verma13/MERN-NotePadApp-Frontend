import React, { useState } from "react";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import IconButton from "@mui/material/IconButton";


function Carousel(props) {
  const [currIndex, setCurrIndex] = useState(0);


  function handlePrevious() {
    setCurrIndex((prevIndex) => {
      return prevIndex <= 0 ? props.images.length - 1 : prevIndex - 1;
    });
    
  }

  function handleNext() {
    setCurrIndex((prevIndex) => {
      return prevIndex === props.images.length - 1 ? 0 : prevIndex + 1;
    });
    
  }

  

  return (
    <div className="carousel">
      <div className="prevCarousel" onClick={handlePrevious}>
        <IconButton>
          <ArrowBackIosIcon
            sx={{
              color: "#e7b10a",
              width: "4rem",
              height: "4rem",
              transition: "width 1s, height 1s",
              transitionTimingFunction: "ease",
              "&:hover": { color: "#F29727",  width: "6rem", height: "6rem"},
            }}
          />
        </IconButton>
      </div>
      <div className="carousel-content">
        
            <img src={props.images[currIndex]} alt="carousel-img" />
            <p>{props.review[currIndex]}</p>
          
      </div>
      <div className="nextCarousel" onClick={handleNext}>
        <IconButton>
          <ArrowForwardIosIcon
            sx={{
              color: "#e7b10a",
              width: "4rem",
              height: "4rem",
              transition: "width 1s, height 1s",
              transitionTimingFunction: "ease",
              "&:hover": { color: "#F29727", width: "6rem", height: "6rem" },
            }}
          />
        </IconButton>
      </div>
    </div>
  );
}

export default Carousel;

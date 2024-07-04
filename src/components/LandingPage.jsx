import React from "react";
// import Heading from "./Heading";
import Footer from "./Footer";
import Content from "./Content";
import Features from "./Features";
import Carousel from "./Carousel";
import images, {review} from "../images";
import GetStarted from "./GetStarted";
import LandingHeader from "./LandingHeader";

function LandingPage(){
    return (
        <div>
        <LandingHeader />
        <Content />
        <Features />
        <Carousel images={images} review={review}/>
        <GetStarted />
        <Footer />
        </div>
    );
} 

// npx update-browserslist-db@latest

export default LandingPage;


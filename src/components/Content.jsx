import React from "react";
import Button from "./Button";

function Content() {
  return (
    <section className="landing-heading">
      <h1 className="main-heading">
        <span>A Simple NoteBook To Keep All Your Notes.</span>
      </h1>
      <div className="secondary-heading">
        <img
          className="noteBook"
          src={process.env.PUBLIC_URL + "/notepad.png"}
          alt="Note-img"
        />
        <span>Add your new note on the go.</span>
      </div>
      <Button />
    </section>
  );
}

export default Content;

import React, { useEffect, useCallback, useState } from "react";
import Quill from "quill";
import { io } from "socket.io-client";
import "quill/dist/quill.snow.css";
import "./style.css";
import { useParams } from "react-router";

const SAVE_INTERVAL_MS = 2000

const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ list: "ordered" }, { list: "bullet" }],
  ["bold", "italic", "underline"],
  [{ color: [] }, { background: [] }],
  [{ script: "sub" }, { script: "super" }],
  [{ align: [] }],
  ["image", "blockquote", "code-block"],
  ["clean"],
];

export default function TextEditor() {
  const params = useParams()
  const { id: documentId } = params
  const [ socket, setSocket ] = useState()
  const [quill, setQuill] = useState()

  useEffect(() => {
    const s = io('http://localhost:3001')
    setSocket(s)

    return () => {s.disconnect()}
  }, [])

  useEffect(() => {
    if (socket == null || quill == null) return

    socket.once('load-document', document => {
      console.log(document)
      quill.enable()
      quill.setContents(document.data)
    })

    socket.emit('get-document', documentId)
  }, [socket, quill, documentId])

  const wrapperRef = useCallback((wrapper) => {
    if (wrapper == null) return;

    wrapper.innerHTML = "";
    const editor = document.createElement("div");
    wrapper.append(editor);

    const q = new Quill(".container", {
      theme: "snow",
      modules: { toolbar: TOOLBAR_OPTIONS },
    });
    q.enable(false)
    q.setText('Loading...')
    setQuill(q)

    return () => (wrapper.innerHTML = "");
  }, []);

  useEffect(() => {
    if (socket == null || quill == null) return 

    const interval = setInterval(() => {
      console.log("saved documtn")
      socket.emit('save-document', quill.getContents())
    }, SAVE_INTERVAL_MS)

    return () => {
      clearInterval(interval)
    }
  }, [socket, quill])

  useEffect(() => {
    // Reciever
    if (socket == null || quill == null) return

    console.log("I workder")
    const handler = (delta) => {
      quill.updateContents(delta)
    }
    socket.on('recieve-changes', handler)

    return () => {
      socket.off('recieve-change', handler)
    }
  }, [socket, quill])

  useEffect(() => {
    // Emmitter
    if (socket == null || quill == null) return

    const handler = (delta, oldDelta, source) => {
      if (source !== 'user') return
      socket.emit('send-changes', delta)
    }
    quill.on('text-change', handler)
    console.log("Send")

    return () => {
      quill.off('text-change', handler)
    }
  }, [socket, quill])

  return <div className="container" ref={wrapperRef}></div>;
}

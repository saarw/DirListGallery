import React, { useEffect, useState } from 'react';
import { Route } from 'react-router-dom';
import { zipUrls } from './zip';
import './App.css';

function parseFileListing(page: string): Array<string> {
  const images: Array<string> = [];
  const seen = new Set<string>();
  const lcPage = page.toLowerCase();
  let n = -1;
  // Find images in quotes, "imagename.jpg"
  while ((n = lcPage.indexOf('.jpg"', n+1)) >= 0) {
    let before = Math.max(page.lastIndexOf('"', n), page.lastIndexOf('/', n));
    let image = page.substring(before + 1, n + '.jpg'.length);
    if (!seen.has(image)) {
      seen.add(image);
      images.push(image);
    }
  }

  return images;
}

type GalleryState =
  | { phase: 'loading' }
  | { phase: 'error', message: string }
  | { phase: 'ready', images: Array<string> };

type DownloadState =
  | { phase: 'idle' }
  | { phase: 'working', done: number, total: number }
  | { phase: 'done', failed: Array<string> }
  | { phase: 'failed', message: string };

function Gallery(props: {
  galleryPath?: string;
}) {
  const [state, setState] = useState<GalleryState>({ phase: 'loading' });
  const [download, setDownload] = useState<DownloadState>({ phase: 'idle' });
  let pagePath = window.location.pathname;
  // router paths always start with / so get rid of ending slash at page path
  pagePath = pagePath.endsWith('/') ? pagePath.substring(0, pagePath.length - 1) : pagePath;

  const galleryName = decodeURIComponent(
    (props.galleryPath || '').replace(/^\/+|\/+$/g, '').split('/').pop() || 'gallery');

  useEffect(() => {
    setDownload({ phase: 'idle' });
    if (props.galleryPath) {
      setState({ phase: 'loading' });
      fetch(pagePath + props.galleryPath)
        .then((rsp) => {
          if (rsp.status === 200) {
            rsp.text().then(text => {
              var images = parseFileListing(text);
              if (props.galleryPath == null) throw Error("Path expected");
              const dirPath = pagePath + (props.galleryPath.endsWith('/') ? props.galleryPath : props.galleryPath + '/');
              setState({ phase: 'ready', images: images.map(imgName => dirPath + imgName) });
            })
            .catch((err) => {
              console.log('Error reading page content', err);
              setState({ phase: 'error', message: 'Could not read the gallery listing.' });
            })
          } else {
            console.log('Error fetch response: ' + rsp.status + ' ' + rsp.statusText);
            setState({ phase: 'error', message: 'Could not load gallery (' + rsp.status + ').' });
          }
        })
        .catch((err) => {
          console.log('Error fetching page', err);
          setState({ phase: 'error', message: 'Could not load gallery. Check your connection.' });
        });
    } else {
      setState({ phase: 'ready', images: [] });
    }
  }, [props.galleryPath]);  // eslint-disable-line react-hooks/exhaustive-deps

  const downloadAll = () => {
    if (state.phase !== 'ready' || download.phase === 'working') return;
    zipUrls(
      state.images,
      (url) => decodeURIComponent(url.split('/').pop() || 'image.jpg'),
      (done, total) => setDownload({ phase: 'working', done, total }),
    )
      .then(({ blob, failed }) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = galleryName + '.zip';
        document.body.appendChild(a);
        a.click();
        a.remove();
        // Keep the blob URL alive while iOS Safari's save sheet is open
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        setDownload({ phase: 'done', failed });
      })
      .catch((err) => {
        console.log('Error creating zip', err);
        setDownload({ phase: 'failed', message: 'Download failed. Check your connection and try again.' });
      });
  };

  const imageCount = state.phase === 'ready' ? state.images.length : 0;
  return <div className="Gallery-main">
    <header className="Gallery-header">
      <div className="Gallery-title">
        <h1>{galleryName}</h1>
        {state.phase === 'ready' &&
          <span className="Gallery-count">{imageCount} {imageCount === 1 ? 'image' : 'images'}</span>}
      </div>
      <button
        className="Download-button"
        disabled={state.phase !== 'ready' || imageCount === 0 || download.phase === 'working'}
        onClick={downloadAll}
      >
        {download.phase === 'working'
          ? 'Zipping ' + download.done + '/' + download.total + '…'
          : 'Download all'}
      </button>
    </header>
    {download.phase === 'done' && download.failed.length > 0 &&
      <div className="Gallery-notice">
        Saved zip — {download.failed.length} {download.failed.length === 1 ? 'file' : 'files'} could not be fetched.
      </div>}
    {download.phase === 'failed' &&
      <div className="Gallery-notice">{download.message}</div>}
    {state.phase === 'loading' && <div className="Gallery-status">Loading…</div>}
    {state.phase === 'error' && <div className="Gallery-status">{state.message}</div>}
    {state.phase === 'ready' && imageCount === 0 &&
      <div className="Gallery-status">No images found in this gallery.</div>}
    {state.phase === 'ready' &&
      <div className="Gallery-images">
        {state.images.map((imagePath) =>
          <img key={imagePath} className="Gallery-image" src={imagePath} loading="lazy" alt=""></img>)}
      </div>}
  </div>;
}

function App() {
  return (
    <div className="App">
      <div className="App-body">
      <Route render={(props) => <Gallery galleryPath={props.location.pathname}></Gallery>}>
      </Route>
      </div>
    </div>
  );
}

export default App;

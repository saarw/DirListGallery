# DirListGallery
Copy DirListGallery to any website that supports directory listings to easily share image galleries by uploading them to subdirectories of the gallery page on the site.

Assume you have a website with image galleries like   
```/gallery1```   
```/gallery2```   

1. Copy the files in the ```build``` directory into the root of the website, or into the directory above your galleries if they are not at the root.
2. You can now share links to the galleries with a path like ```/#/gallery1```. If your galleries are in a subdirectory, say ```/galleries/gallery1```, you should copy DirListGallery to the ```/galleries``` directory and the links will look like ```/galleries/#/gallery1```

You can now quickly share a new gallery of photos by uploading them to a new subdirectory (```my_new_gallery```) and sharing the link with ```/#/my_new_gallery```

### Privacy
The gallery page in the directory above the galleries prevents listing of subdirectories, so visitors should only be able to find your galleries if they know the link with the gallery name after #/. There are programs that can test many different subdirectory links, so you can increase the privacy of your galleries by giving them long and hard to guess names (same rules as for passwords).

## How it works and how to customize
The gallery is based on React and React Router. It fetches the directory listing of gallery directories specified by the hash-path.

### Customize
Clone the repo and run ```npm install```in the root.

Modify the code and run ```npm run build``` in the root to rebuild the gallery in the build directory.



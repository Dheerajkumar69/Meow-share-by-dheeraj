# ShareDrop - Modern File Sharing Platform

A sleek, modern web application that allows users to transfer all types of data — including text, images, movies, documents, and any other file formats.

![ShareDrop Preview](https://via.placeholder.com/800x400?text=ShareDrop+Preview)

## Features

🔄 **Drag & Drop or Upload Interface**
- Easy file uploading with drag-and-drop functionality
- Dynamic thumbnails and file-type icons after upload

🔗 **QR Code for Easy Sharing**
- Each uploaded file generates a unique QR code
- Receivers can scan the QR code to download the file
- Fallback download link always available

📦 **Support for All File Types**
- No restrictions on format: text, images, videos, documents, zip files, etc.
- Large file support

💎 **Modern UI/UX Design**
- Dynamic gradient colors with glassmorphism elements
- Smooth animations powered by Framer Motion
- Mobile responsive with a clean, tech-forward aesthetic

## Tech Stack

- **Frontend:** Next.js, React, TypeScript
- **Styling:** TailwindCSS
- **Animations:** Framer Motion
- **QR Code:** qrcode.react
- **File Uploading:** react-dropzone
- **ID Generation:** uuid

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/sharing-platform.git
cd sharing-platform
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Navigate to the home page
2. Drag and drop a file onto the upload area or click to select a file
3. Once the file is uploaded, a QR code will be generated
4. Share the QR code or the provided link with others
5. Recipients can scan the QR code or use the link to download the file

## Deployment

The application can be easily deployed to Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyourusername%2Fsharing-platform)

## Future Enhancements

- End-to-end encryption for files
- User authentication and file management
- Multiple file upload support
- Expiration date customization
- File compression options
- Password protection for downloads

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Heroicons](https://heroicons.com/) for beautiful SVG icons
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
- [React Dropzone](https://react-dropzone.js.org/) for the drag and drop file uploader
- [QRCode.react](https://github.com/zpao/qrcode.react) for QR code generation

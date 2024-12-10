// pages/index.js
import React, { useState, useEffect } from 'react';
import Chatbox from '../app/components/ChatBox';
import Menubar from '../app/components/MenuBar';
import Bookmarks from '../app/components/Bookmarks';
import { getSession } from "next-auth/react"
import ProtectedRoute from "../app/components/ProtectedRoute"
import { useRouter } from 'next/router';

export default function HomePage() {
	const router = useRouter();
	const [selectedBookmarkId, setSelectedBookmarkId] = useState(null);
	const [selectedBookmarkTitle, setSelectedBookmarkTitle] = useState(null);
	const [reservedBookmarkTitles, setreservedBookmarkTitles] = useState(['all responses', 'daily summary']);

	useEffect(() => {
		if (router.isReady) {
			const { bookmarkId, bookmarkTitle } = router.query;
			
			// Only update if the values are different to avoid loops
			if (bookmarkId && bookmarkId !== selectedBookmarkId) {
				setSelectedBookmarkId(bookmarkId);
			}
			if (bookmarkTitle && decodeURIComponent(bookmarkTitle) !== selectedBookmarkTitle) {
				setSelectedBookmarkTitle(decodeURIComponent(bookmarkTitle));
			}
		}
	}, [router.isReady, router.query]);

	const handleBookmarkSelect = (bookmarkId, bookmarkTitle) => {
		setSelectedBookmarkId(bookmarkId);
		setSelectedBookmarkTitle(bookmarkTitle);
	};

	return (
		<ProtectedRoute>
			<Menubar onBookmarkSelect={handleBookmarkSelect} />
			<div className="flex h-screen bg-[#000000]">
				<Bookmarks 
					changeSelectedBookmark={handleBookmarkSelect} 
					selectedBookmarkId={selectedBookmarkId}
					selectedBookmarkTitle={selectedBookmarkTitle}
					reservedBookmarkTitles={reservedBookmarkTitles}
				/>
				<div className="flex-1 flex flex-col justify-end">
					<Chatbox 
						selectedBookmarkId={selectedBookmarkId} 
						selectedBookmarkTitle={selectedBookmarkTitle}
						reservedBookmarkTitles={reservedBookmarkTitles}
					/>
				</div>
			</div>
		</ProtectedRoute>
	);
}

	export async function getServerSideProps(context) {
		const session = await getSession(context)
		console.log("Session in getServerSideProps:", session) // Server-side log

		if (!session) {
			return {
				redirect: {
					destination: '/api/auth/signin',
					permanent: false,
				},
			}
		}

		return {
			props: { session },
		}
	}

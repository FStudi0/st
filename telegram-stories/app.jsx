const { useState, useEffect } = React;

function App() {
  const [stories, setStories] = useState([]);
  const [comments, setComments] = useState({});
  const [activeStory, setActiveStory] = useState(null);
  const [viewedStories, setViewedStories] = useState(new Set());
  const [isAdmin, setIsAdmin] = useState(false); // State для проверки админских прав

  useEffect(() => {
    // Remove stories older than 24 hours
    const interval = setInterval(() => {
      setStories((prev) =>
        prev.filter((story) => Date.now() - story.timestamp < 24 * 60 * 60 * 1000)
      );
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  // Function to check admin status via Telegram API
  const checkAdmin = async () => {
    try {
      const BOT_TOKEN = "YOUR_BOT_TOKEN"; // Замените на ваш токен
      const CHAT_ID = "YOUR_CHAT_ID"; // Замените на ID чата или канала
      const USER_ID = prompt("Enter your Telegram User ID:"); // Запрос ID пользователя

      if (!USER_ID) {
        alert("User ID is required.");
        return;
      }

      // Fetch user's status from Telegram API
      const response = await fetch(
        `https://api.telegram.org/bot ${BOT_TOKEN}/getChatMember?chat_id=${CHAT_ID}&user_id=${USER_ID}`
      );

      const data = await response.json();

      if (data.ok && data.result.status === "administrator") {
        setIsAdmin(true);
        alert("You are authorized as an admin.");
      } else {
        alert("You are not authorized to upload content.");
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
      alert("An error occurred while verifying admin status.");
    }
  };

  const handleUploadStory = (e) => {
    if (!isAdmin) {
      alert("Only admins can upload content.");
      return;
    }

    const file = e.target.files[0];
    if (!file) {
      alert("Please select a valid file.");
      return;
    }

    const isVideo = file.type.startsWith('video');
    const isImage = file.type.startsWith('image');

    if (!isVideo && !isImage) {
      alert("Please upload a valid image or video file.");
      return;
    }

    const fileURL = URL.createObjectURL(file);

    if (isVideo) {
      const videoElement = document.createElement('video');
      videoElement.src = fileURL;
      videoElement.addEventListener('loadedmetadata', () => {
        let duration = videoElement.duration;

        // Trim video to 1 minute if longer
        if (duration > 60) {
          duration = 60;
        }

        setStories((prev) => [
          ...prev,
          {
            id: Date.now(),
            mediaUrl: fileURL,
            isVideo: true,
            timestamp: Date.now(),
            views: 0,
            duration,
          },
        ]);
      });
    } else {
      // For images, directly add to stories
      setStories((prev) => [
        ...prev,
        {
          id: Date.now(),
          mediaUrl: fileURL,
          isVideo: false,
          timestamp: Date.now(),
          views: 0,
        },
      ]);
    }
  };

  const handleView = (id) => {
    if (!viewedStories.has(id)) {
      setStories((prev) =>
        prev.map((story) =>
          story.id === id ? { ...story, views: story.views + 1 } : story
        )
      );
      setViewedStories((prev) => new Set(prev).add(id));
    }
    setActiveStory(id);
  };

  const handleLike = (id) => {
    setStories((prev) =>
      prev.map((story) =>
        story.id === id ? { ...story, likes: (story.likes || 0) + 1 } : story
      )
    );
  };

  const handleComment = (id, comment) => {
    setComments((prev) => ({
      ...prev,
      [id]: [...(prev[id] || []), comment],
    }));

    console.log(`Sending comment to bot for story ${id}:`, comment);
    alert(
      `Comment sent to bot for story ${id}. Bot will notify admin with this comment.`
    );
  };

  const closeStory = () => {
    setActiveStory(null);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-gray-800">
        <h1 className="text-xl font-bold">Telegram Stories</h1>
        <div>
          {isAdmin ? (
            <label className="bg-blue-500 px-4 py-2 rounded cursor-pointer">
              <input type="file" accept="image/*, video/*" onChange={handleUploadStory} className="hidden" />
              Upload Story
            </label>
          ) : (
            <button onClick={checkAdmin} className="bg-blue-500 px-4 py-2 rounded">
              Verify Admin
            </button>
          )}
        </div>
      </header>

      {/* Stories Grid */}
      <main className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {stories.map((story) => (
          <div key={story.id} className="relative group overflow-hidden rounded-lg shadow-lg">
            {/* Media Preview */}
            {story.isVideo ? (
              <video
                src={story.mediaUrl}
                onClick={() => handleView(story.id)}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 cursor-pointer"
                muted
                loop
                autoPlay
              ></video>
            ) : (
              <img
                src={story.mediaUrl}
                alt={`Story ${story.id}`}
                onClick={() => handleView(story.id)}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 cursor-pointer"
              />
            )}

            {/* Overlay with Views */}
            <div className="absolute top-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-xs flex gap-2">
              <span>👁️ {story.views}</span>
            </div>
          </div>
        ))}
        {stories.length === 0 && (
          <div className="col-span-full text-center text-gray-400">
            No stories available. Upload one!
          </div>
        )}
      </main>

      {/* Active Story Viewer */}
      {activeStory !== null && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
          onClick={closeStory}
        >
          <div
            className="bg-black rounded-3xl overflow-hidden w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-3xl h-full sm:h-auto sm:max-h-[90vh] shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-full">
              {/* Close Button */}
              <button
                onClick={closeStory}
                className="absolute top-2 right-2 bg-gray-700 text-white px-2 py-1 rounded-full z-10"
              >
                ✕
              </button>

              {/* Story Media */}
              {stories.find((s) => s.id === activeStory)?.isVideo ? (
                <video
                  src={stories.find((s) => s.id === activeStory)?.mediaUrl}
                  autoPlay
                  controls
                  className="w-full h-full object-cover"
                  onLoadedMetadata={(e) => {
                    const video = e.target;
                    if (video.duration > 60) {
                      video.currentTime = 0;
                      video.playbackRate = 1;
                      video.addEventListener('timeupdate', () => {
                        if (video.currentTime >= 60) {
                          video.pause();
                        }
                      });
                    }
                  }}
                ></video>
              ) : (
                <img
                  src={stories.find((s) => s.id === activeStory)?.mediaUrl}
                  alt={`Active Story ${activeStory}`}
                  className="w-full h-full object-cover"
                />
              )}

              {/* Like Button */}
              <button
                onClick={() => handleLike(activeStory)}
                className="absolute bottom-4 right-4 bg-red-500 px-4 py-2 rounded-full text-sm hover:bg-red-600 transition-colors z-10"
              >
                ❤️ Like ({stories.find((s) => s.id === activeStory)?.likes || 0})
              </button>

              {/* Comment Section */}
              <div className="absolute bottom-0 left-0 w-full bg-black bg-opacity-70 p-4">
                <textarea
                  placeholder="Add a comment..."
                  className="w-full bg-gray-700 text-white p-2 rounded mb-2"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleComment(activeStory, e.target.value);
                      e.target.value = '';
                    }
                  }}
                ></textarea>
                <div className="space-y-2 max-h-24 overflow-y-auto">
                  {(comments[activeStory] || []).map((comment, index) => (
                    <div key={index} className="bg-gray-700 p-2 rounded">
                      {comment}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer for Bot Integration */}
      <footer className="p-4 bg-gray-800 text-center text-sm">
        <p>Open this page in your Telegram bot's webview to interact with stories.</p>
      </footer>
    </div>
  );
}

// Render the App component
ReactDOM.createRoot(document.getElementById('root')).render(<App />);

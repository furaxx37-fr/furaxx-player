class FlyleafWebPlayer {
    constructor() {
        this.video = document.getElementById('mainVideo');
        this.playlist = [];
        this.currentIndex = 0;
        this.isPlaying = false;
        
        this.initializeElements();
        this.initSubtitles();
        this.bindEvents();
        this.setupKeyboardShortcuts();
    }

    initSubtitles() {
        this.subtitles = [];
        this.currentSubtitleIndex = 0;
    }

    initializeElements() {
        // Control elements
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.speedSelect = document.getElementById('speedSelect');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressBar = document.getElementById('progressBar');
        this.currentTimeDisplay = document.getElementById('currentTime');
        this.durationDisplay = document.getElementById('duration');
        
        // UI elements
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.browseBtn = document.getElementById('browseBtn');
        this.videoWrapper = document.getElementById('videoWrapper');
        this.playlistContainer = document.getElementById('playlist');
        this.fileInfoContainer = document.getElementById('fileInfo');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.clearPlaylistBtn = document.getElementById('clearPlaylist');
        this.shortcutsModal = document.getElementById('shortcutsModal');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.closeShortcutsBtn = document.getElementById('closeShortcuts');
        this.subtitleDisplay = document.getElementById('subtitleDisplay');
    }

    bindEvents() {
        // File handling
        this.browseBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));
        
        // Drag and drop
        this.dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
        this.dropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.dropZone.addEventListener('drop', this.handleDrop.bind(this));
        
        // Video events
        this.video.addEventListener('loadedmetadata', this.onVideoLoaded.bind(this));
        this.video.addEventListener('timeupdate', this.onTimeUpdate.bind(this));
        this.video.addEventListener('ended', this.onVideoEnded.bind(this));
        this.video.addEventListener('play', () => this.updatePlayButton(true));
        this.video.addEventListener('pause', () => this.updatePlayButton(false));
        this.video.addEventListener('error', this.onVideoError.bind(this));
        
        // Controls
        this.playPauseBtn.addEventListener('click', this.togglePlayPause.bind(this));
        this.stopBtn.addEventListener('click', this.stop.bind(this));
        this.prevBtn.addEventListener('click', this.previousTrack.bind(this));
        this.nextBtn.addEventListener('click', this.nextTrack.bind(this));
        this.volumeSlider.addEventListener('input', this.updateVolume.bind(this));
        this.speedSelect.addEventListener('change', this.updateSpeed.bind(this));
        this.progressContainer.addEventListener('click', this.seek.bind(this));
        
        // UI controls
        this.fullscreenBtn.addEventListener('click', this.toggleFullscreen.bind(this));
        this.clearPlaylistBtn.addEventListener('click', this.clearPlaylist.bind(this));
        this.settingsBtn.addEventListener('click', () => this.shortcutsModal.classList.remove('hidden'));
        this.closeShortcutsBtn.addEventListener('click', () => this.shortcutsModal.classList.add('hidden'));
        
        // Close modal on outside click
        this.shortcutsModal.addEventListener('click', (e) => {
            if (e.target === this.shortcutsModal) {
                this.shortcutsModal.classList.add('hidden');
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Prevent shortcuts when typing in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    this.togglePlayPause();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.seekRelative(10);
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.seekRelative(-10);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.adjustVolume(10);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.adjustVolume(-10);
                    break;
                case 'KeyF':
                    e.preventDefault();
                    this.toggleFullscreen();
                    break;
                case 'KeyM':
                    e.preventDefault();
                    this.toggleMute();
                    break;
                case 'KeyN':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.nextTrack();
                    }
                    break;
                case 'KeyP':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.previousTrack();
                    }
                    break;
            }
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        this.dropZone.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.dropZone.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.dropZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        this.handleFiles(files);
    }

    handleFiles(files) {
        const mediaFiles = Array.from(files).filter(file => 
            file.type.startsWith('video/') || file.type.startsWith('audio/')
        );
        
        const subtitleFiles = Array.from(files).filter(file => {
            const extension = file.name.split('.').pop().toLowerCase();
            return ['srt', 'vtt', 'ass', 'ssa'].includes(extension);
        });
        
        if (mediaFiles.length === 0 && subtitleFiles.length === 0) {
            this.showNotification('No valid media or subtitle files found', 'error');
            return;
        }

        // Handle media files
        mediaFiles.forEach(file => {
            const url = URL.createObjectURL(file);
            this.playlist.push({
                name: file.name,
                url: url,
                size: this.formatFileSize(file.size),
                type: file.type,
                file: file
            });
        });

        // Handle subtitle files
        subtitleFiles.forEach(file => {
            this.loadSubtitleFile(file);
        });

        if (mediaFiles.length > 0) {
            this.updatePlaylistUI();
        
        if (this.playlist.length === mediaFiles.length) {
            // First files added, start playing the first one
            this.loadTrack(0);
        }

        this.showNotification(`Added ${mediaFiles.length} file(s) to playlist`, 'success');
    }

    loadTrack(index) {
        if (index < 0 || index >= this.playlist.length) return;
        
        this.currentIndex = index;
        const track = this.playlist[index];
        
        this.video.src = track.url;
        this.video.load();
        
        this.dropZone.classList.add('hidden');
        this.videoWrapper.classList.remove('hidden');
        
        this.updateFileInfo(track);
        this.updatePlaylistUI();
    }

    onVideoLoaded() {
        this.durationDisplay.textContent = this.formatTime(this.video.duration);
        this.updateFileInfo(this.playlist[this.currentIndex]);
    }

    onTimeUpdate() {
        const progress = (this.video.currentTime / this.video.duration) * 100;
        this.progressBar.style.width = `${progress}%`;
        this.currentTimeDisplay.textContent = this.formatTime(this.video.currentTime);
        
        // Update subtitle display
        this.updateSubtitleDisplay();
    }

    onVideoEnded() {
        if (this.currentIndex < this.playlist.length - 1) {
            this.nextTrack();
        } else {
            this.stop();
        }
    }

    onVideoError(e) {
        console.error('Video error:', e);
        this.showNotification('Error loading video file', 'error');
    }

    updateSubtitleDisplay() {
        if (!this.subtitles || this.subtitles.length === 0) return;
        
        const currentTime = this.video.currentTime;
        const activeSubtitle = this.subtitles.find(sub => 
            currentTime >= sub.start && currentTime <= sub.end
        );
        
        if (activeSubtitle) {
            this.subtitleDisplay.textContent = activeSubtitle.text;
            this.subtitleDisplay.style.display = 'block';
        } else {
            this.subtitleDisplay.style.display = 'none';
        }
    }


    loadSubtitleFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            const extension = file.name.split('.').pop().toLowerCase();
            
            try {
                let parsedSubtitles = [];
                
                if (extension === 'srt') {
                    parsedSubtitles = this.parseSRT(content);
                } else if (extension === 'vtt') {
                    parsedSubtitles = this.parseVTT(content);
                } else if (extension === 'ass' || extension === 'ssa') {
                    parsedSubtitles = this.parseASS(content);
                }
                
                if (parsedSubtitles.length > 0) {
                    this.subtitles = parsedSubtitles;
                    this.showNotification(`Loaded ${parsedSubtitles.length} subtitle entries from ${file.name}`, 'success');
                } else {
                    this.showNotification(`No subtitles found in ${file.name}`, 'warning');
                }
            } catch (error) {
                console.error('Subtitle parsing error:', error);
                this.showNotification(`Error parsing subtitle file: ${file.name}`, 'error');
            }
        };
        
        reader.onerror = () => {
            this.showNotification(`Error reading subtitle file: ${file.name}`, 'error');
        };
        
        reader.readAsText(file);
    }

    parseSRT(content) {
        const subtitles = [];
        const blocks = content.trim().split(/\n\s*\n/);
        
        blocks.forEach(block => {
            const lines = block.trim().split('\n');
            if (lines.length >= 3) {
                const timeMatch = lines[1].match(/(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/);
                if (timeMatch) {
                    const start = this.timeToSeconds(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]);
                    const end = this.timeToSeconds(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]);
                    const text = lines.slice(2).join('\n').replace(/<[^>]*>/g, '');
                    
                    subtitles.push({ start, end, text });
                }
            }
        });
        
        return subtitles;
    }

    parseVTT(content) {
        const subtitles = [];
        const lines = content.split('\n');
        let i = 0;
        
        // Skip WEBVTT header
        while (i < lines.length && !lines[i].includes('-->')) {
            i++;
        }
        
        while (i < lines.length) {
            const line = lines[i].trim();
            if (line.includes('-->')) {
                const timeMatch = line.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3}) --> (\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
                if (timeMatch) {
                    const start = this.timeToSeconds(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]);
                    const end = this.timeToSeconds(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]);
                    
                    i++;
                    let text = '';
                    while (i < lines.length && lines[i].trim() !== '') {
                        text += (text ? '\n' : '') + lines[i].trim();
                        i++;
                    }
                    
                    text = text.replace(/<[^>]*>/g, '');
                    subtitles.push({ start, end, text });
                }
            }
            i++;
        }
        
        return subtitles;
    }

    parseASS(content) {
        const subtitles = [];
        const lines = content.split('\n');
        
        lines.forEach(line => {
            if (line.startsWith('Dialogue:')) {
                const parts = line.split(',');
                if (parts.length >= 10) {
                    const start = this.assTimeToSeconds(parts[1]);
                    const end = this.assTimeToSeconds(parts[2]);
                    const text = parts.slice(9).join(',').replace(/\\N/g, '\n').replace(/{[^}]*}/g, '');
                    
                    subtitles.push({ start, end, text });
                }
            }
        });
        
        return subtitles;
    }

    timeToSeconds(hours, minutes, seconds, milliseconds) {
        return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds) + parseInt(milliseconds) / 1000;
    }

    assTimeToSeconds(timeStr) {
        const parts = timeStr.split(':');
        if (parts.length === 3) {
            return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
        }
        return 0;
    }
    togglePlayPause() {
        if (!this.video.src) return;
        
        if (this.video.paused) {
            this.video.play().catch(e => {
                console.error('Play error:', e);
                this.showNotification('Error playing video', 'error');
            });
        } else {
            this.video.pause();
        }
    }

    stop() {
        this.video.pause();
        this.video.currentTime = 0;
        this.updatePlayButton(false);
    }

    previousTrack() {
        if (this.currentIndex > 0) {
            this.loadTrack(this.currentIndex - 1);
        }
    }

    nextTrack() {
        if (this.currentIndex < this.playlist.length - 1) {
            this.loadTrack(this.currentIndex + 1);
        }
    }

    updateVolume() {
        this.video.volume = this.volumeSlider.value / 100;
    }

    updateSpeed() {
        this.video.playbackRate = parseFloat(this.speedSelect.value);
    }

    seek(e) {
        if (!this.video.duration) return;
        
        const rect = this.progressContainer.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        this.video.currentTime = percentage * this.video.duration;
    }

    seekRelative(seconds) {
        if (!this.video.duration) return;
        
        this.video.currentTime = Math.max(0, Math.min(
            this.video.duration, 
            this.video.currentTime + seconds
        ));
    }

    adjustVolume(delta) {
        const newVolume = Math.max(0, Math.min(100, 
            parseInt(this.volumeSlider.value) + delta
        ));
        this.volumeSlider.value = newVolume;
        this.updateVolume();
    }

    toggleMute() {
        if (this.video.volume > 0) {
            this.video.volume = 0;
            this.volumeSlider.value = 0;
        } else {
            this.video.volume = 1;
            this.volumeSlider.value = 100;
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.videoWrapper.requestFullscreen().catch(e => {
                console.error('Fullscreen error:', e);
            });
        } else {
            document.exitFullscreen();
        }
    }

    clearPlaylist() {
        this.playlist.forEach(track => {
            if (track.url.startsWith('blob:')) {
                URL.revokeObjectURL(track.url);
            }
        });
        
        this.playlist = [];
        this.currentIndex = 0;
        this.video.src = '';
        
        this.videoWrapper.classList.add('hidden');
        this.dropZone.classList.remove('hidden');
        
        this.updatePlaylistUI();
        this.updateFileInfo(null);
        
        this.showNotification('Playlist cleared', 'success');
    }

    updatePlayButton(isPlaying) {
        const icon = this.playPauseBtn.querySelector('i');
        icon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
        this.isPlaying = isPlaying;
    }

    updatePlaylistUI() {
        if (this.playlist.length === 0) {
            this.playlistContainer.innerHTML = `
                <div class="text-gray-500 text-center py-8">
                    <i class="fas fa-music text-3xl mb-2"></i>
                    <p>No files loaded</p>
                </div>
            `;
            return;
        }

        this.playlistContainer.innerHTML = this.playlist.map((track, index) => `
            <div class="playlist-item p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                index === this.currentIndex ? 'bg-indigo-600/30 border border-indigo-500' : 'bg-gray-800/50 hover:bg-gray-700/50'
            }" data-index="${index}">
                <div class="flex items-center space-x-3">
                    <i class="fas ${track.type.startsWith('video/') ? 'fa-video' : 'fa-music'} text-indigo-400"></i>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium truncate">${track.name}</p>
                        <p class="text-xs text-gray-400">${track.size}</p>
                    </div>
                    ${index === this.currentIndex ? '<i class="fas fa-play text-indigo-400"></i>' : ''}
                </div>
            </div>
        `).join('');

        // Add click handlers to playlist items
        this.playlistContainer.querySelectorAll('.playlist-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                this.loadTrack(index);
            });
        });
    }

    updateFileInfo(track) {
        if (!track) {
            this.fileInfoContainer.innerHTML = `
                <div class="text-gray-500 text-center py-4">
                    <i class="fas fa-file text-2xl mb-2"></i>
                    <p>No file selected</p>
                </div>
            `;
            return;
        }

        this.fileInfoContainer.innerHTML = `
            <div class="space-y-3">
                <div>
                    <label class="text-xs text-gray-400 uppercase tracking-wide">Name</label>
                    <p class="text-sm break-words">${track.name}</p>
                </div>
                <div>
                    <label class="text-xs text-gray-400 uppercase tracking-wide">Size</label>
                    <p class="text-sm">${track.size}</p>
                </div>
                <div>
                    <label class="text-xs text-gray-400 uppercase tracking-wide">Type</label>
                    <p class="text-sm">${track.type}</p>
                </div>
                ${this.video.duration ? `
                <div>
                    <label class="text-xs text-gray-400 uppercase tracking-wide">Duration</label>
                    <p class="text-sm">${this.formatTime(this.video.duration)}</p>
                </div>
                ` : ''}
                ${this.video.videoWidth ? `
                <div>
                    <label class="text-xs text-gray-400 uppercase tracking-wide">Resolution</label>
                    <p class="text-sm">${this.video.videoWidth} × ${this.video.videoHeight}</p>
                </div>
                ` : ''}
            </div>
        `;
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '00:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full ${
            type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-green-600' : 'bg-blue-600'
        }`;
        notification.innerHTML = `
            <div class="flex items-center space-x-2">
                <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);
        
        // Animate out and remove
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Initialize player when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FlyleafWebPlayer();
});

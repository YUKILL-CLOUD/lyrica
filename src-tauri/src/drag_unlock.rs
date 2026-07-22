// Lyrica — Precision 0.25s Hold-to-Drag & 5s Auto-Relock Engine
// 1. Normal single clicks pass straight through (click-through mode stays 100% active).
// 2. Pressing and holding Left Mouse Button over the overlay for 0.25 seconds (250ms) unlocks it for moving/dragging.
// 3. Releasing the mouse button auto-relocks the overlay after 5 seconds (5000ms) of inactivity.

use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};

use crate::state::AppState;

#[repr(C)]
#[derive(Default, Copy, Clone)]
struct POINT {
    x: i32,
    y: i32,
}

#[link(name = "user32")]
extern "system" {
    fn GetAsyncKeyState(vKey: i32) -> i16;
    fn GetCursorPos(lpPoint: *mut POINT) -> i32;
}

pub fn start_drag_unlock_monitor(app: AppHandle) {
    thread::spawn(move || {
        tracing::info!("Started Precision 0.25s Hold-to-Drag & 5s Auto-Relock monitor thread");

        let mut press_start_time: Option<Instant> = None;
        let mut release_start_time: Option<Instant> = None;
        let mut is_unlocked_by_hold = false;

        loop {
            thread::sleep(Duration::from_millis(25));

            let overlay_win = match app.get_webview_window("overlay") {
                Some(w) => w,
                None => continue,
            };

            let pos = match overlay_win.outer_position() {
                Ok(p) => p,
                Err(_) => continue,
            };

            let size = match overlay_win.outer_size() {
                Ok(s) => s,
                Err(_) => continue,
            };

            let win_x = pos.x;
            let win_y = pos.y;
            let win_w = size.width as i32;
            let win_h = size.height as i32;

            unsafe {
                let mut cursor = POINT::default();
                if GetCursorPos(&mut cursor) != 0 {
                    let cx = cursor.x;
                    let cy = cursor.y;

                    // Check if mouse cursor is inside overlay window bounds
                    let is_inside = cx >= win_x && cx <= (win_x + win_w) && cy >= win_y && cy <= (win_y + win_h);
                    
                    // Check if left mouse button is pressed down (VK_LBUTTON = 0x01)
                    let is_lbutton_down = GetAsyncKeyState(0x01) < 0;

                    if is_inside && is_lbutton_down {
                        // User is holding left mouse button down over the overlay
                        release_start_time = None; // Reset relock countdown

                        if press_start_time.is_none() {
                            press_start_time = Some(Instant::now());
                        } else if let Some(start) = press_start_time {
                            // Require 0.25 seconds (250ms) of continuous left click hold before unlocking
                            if start.elapsed() >= Duration::from_millis(250) && !is_unlocked_by_hold {
                                tracing::info!("0.25s Hold-to-Drag threshold reached! Unlocking overlay for dragging.");

                                let _ = overlay_win.set_ignore_cursor_events(false);
                                if let Some(state) = app.try_state::<AppState>() {
                                    if let Ok(mut locked) = state.overlay_locked.lock() {
                                        *locked = false;
                                    }
                                }
                                let _ = app.emit("lyrica://overlay-locked", false);
                                is_unlocked_by_hold = true;
                            }
                        }
                    } else {
                        // Mouse button released or cursor moved outside
                        press_start_time = None; // Reset hold countdown

                        if is_unlocked_by_hold {
                            if release_start_time.is_none() {
                                release_start_time = Some(Instant::now());
                            } else if let Some(rel_start) = release_start_time {
                                // Auto-relock 5 seconds (5000ms) after mouse release
                                if rel_start.elapsed() >= Duration::from_millis(5000) {
                                    tracing::info!("5s inactivity reached after release! Auto-relocking overlay.");

                                    let _ = overlay_win.set_ignore_cursor_events(true);
                                    if let Some(state) = app.try_state::<AppState>() {
                                        if let Ok(mut locked) = state.overlay_locked.lock() {
                                            *locked = true;
                                        }
                                    }
                                    let _ = app.emit("lyrica://overlay-locked", true);
                                    is_unlocked_by_hold = false;
                                    release_start_time = None;
                                }
                            }
                        }
                    }
                }
            }
        }
    });
}

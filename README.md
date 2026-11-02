# Rio Animation - What If (auto render)

90 video (30 video dài 16:9 + 60 Shorts 9:16) dựng tự động từ `data/scripts.json`:
giọng Nam tiếng Anh (Kokoro `am_michael`), hoạt hình 2D vẽ bằng code (2D Studio), nhạc + SFX tự tạo.

- Render chạy trên GitHub Actions (`.github/workflows/render.yml`), kích hoạt khi sửa `pipeline/trigger.txt`.
- Kết quả nằm ở mục **Releases**: 6 thư mục lớn, mỗi thư mục 15 video, mỗi video là 1 file zip
  (MP4, giọng đọc MP3, phụ đề SRT, kịch bản, ảnh bìa, thông tin đăng YouTube).
- Chạy lại video lỗi: thêm dòng `ONLY:long_3,short_12` vào `pipeline/trigger.txt` rồi commit.
- Chạy 1 video trên máy: `bash pipeline/run_one.sh long 1`

## Tải toàn bộ về máy (giữ đúng cấu trúc 6 thư mục lớn)
- Windows: tải file `tai_ve_windows.ps1`, chuột phải > Run with PowerShell.
- macOS: tải `tai_ve_mac.sh`, mở Terminal và chạy `bash tai_ve_mac.sh`.
Tổng dung lượng khoảng 13 GB.

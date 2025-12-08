# iOS Shortcuts – URL scheme and sample flow

## URL scheme
- Base: your deployed HTTPS origin or `http://localhost:4173` while testing locally.
- Query params (all optional; only set what you want to prefill):
  - `payout` — offer payout (number)
  - `finish` — HH:MM local time when the order would finish (24h)
  - `miles` — estimated miles to drive
  - `cpm` — cost per mile (dollars)
  - `target` — target rate per hour
  - `start` — shift start HH:MM (24h)
  - `earned` — earnings so far in the shift
  - `buffer` — buffer minutes to add to the run
- Example deep link:
  ```
  https://decider.example.com/?payout=14.5&finish=09:42&miles=3.2&cpm=0.35&target=25&start=08:30&earned=40&buffer=5
  ```

## Sample Shortcut (prefill + open)
1. **Text → Dictionary (optional):** Use Dictation or Ask Each Time to capture payout, miles, finish time, and cost-per-mile in one prompt.
2. **Build URL:** Create a `URL` action with the base of your deployment and query params above (e.g., `https://decider.example.com/?payout=${payout}&finish=${finish}&miles=${miles}&cpm=${cpm}`).
3. **Open:** Add **Open URL** to launch the PWA with the form prefilled. The PWA keeps the values in session, so you can tweak them after opening.
4. **Attach to a trigger (optional):**
   - Back Tap (Settings → Accessibility → Touch → Back Tap → choose Shortcut)
   - Action Button (iPhone 15 Pro/Max)
   - Apple Watch complication
   - Automation: Shortcuts → Automation → App → _When DoorDash is Opened_ → Run the Shortcut (disable “Ask Before Running” if available)

## Tips
- HH:MM values are local time; 24-hour input avoids AM/PM mistakes.
- If you also use offline mode, the last Shortcut values remain cached until you change them in the PWA.
- For API-backed sessions, the driver profile and ML metadata load after the page opens; you can submit immediately with the prefilled offer data.

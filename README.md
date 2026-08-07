# Interviewcoach-AI

AI-powered mock interview platform that helps job seekers prepare for technical and behavioral interviews through AI-generated questions, personalized feedback, and interview progress tracking.

## Team

- Onesmus Dzidzai Maenzanise
- Stephanie Dacullo Selanoba
- Philip Izekor
- Bhekimpilo Ncube

## Favorite Quote

> "Building the future starts with asking better questions." Inspired by Tony Stark


## Stephanie Selanoba's Favorite Quote
> "In the end, we only regret the chances we didn't take"  --Lewis Carroll

## Philip Izekor's Favorite Quote
>"That which we persist in doing becomes easier, not that the task has changed, but that our ability to do it has increased"


###### Features ######

## Authentication (Login & Register)
Registration (/register): Allows new users to create an account by submitting their details (ex. email & password). Passwords are securely hashed before being stored in the database.

Login (/login): Authenticates existing users by verifying their credentials. Upon successful login, a session or JWT token is generated to authorize future requests.

## Password Reset (via Resend API)
Reset: Users can enter their email address to request a password reset link if they forget their password. The backend uses the Resend API to securely generate and send a password reset email containing a secure, time-sensitive token link to the user's inbox.

## Resume Management (Upload, View, & Delete)
Upload Resume: Authenticated users can upload their resume file (ex. PDF or DOCX). Files are stored securely in cloud storage.

View Resume: Users or authorized viewers can retrieve and open/preview the uploaded resume directly within the application interface.

Delete Resume: Users can remove their currently uploaded resume from the system, which deletes the file from storage and updates the database reference.
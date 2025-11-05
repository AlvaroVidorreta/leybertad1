# Example Firestore Rules

Copy and paste these rules into the Firestore Console -> Rules. Adapt as needed.

rules_version = '2';
service cloud.firestore {
match /databases/{database}/documents {

    // Public read access to laws and profiles
    match /laws/{lawId} {
      allow read: if true;

      // Comments are stored inside the law's comentarios array or a subcollection.
      // Only authenticated users can add comments via the server API, so client writes
      // should be restricted. If you want to allow client-side comment writes,
      // require auth:
      allow create: if false; // disallow direct client-side creation
      allow update: if false; // disallow direct updates from clients
    }

    // Profiles: users can read and update their own profile
    match /profiles/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Prevent direct client writes to votes/saves subcollections; server should handle them
    match /laws/{lawId}/votes/{voteId} {
      allow read: if true;
      allow write: if false;
    }

    match /{document=**} {
      allow read: if false;
      allow write: if false;
    }

}
}

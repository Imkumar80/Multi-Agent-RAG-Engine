# This is a guide to how each of us can contribute peacefully

### Step 1: Always fork the repo to your account

You will get access to the repo, just fork it to you GitHub account. Peace

### Step 2: Clone the repo 

```
git clone <repo_name>
```

```repo_name``` should be from your account (doesn't matter ig, but yeah it'll be better)

### Step 3: Access to the code. Do git pull always

```
git pull
```

You only need to clone initially, but **always** do ```git pull```.

### Step 4: Make sure you did ```git pull```

Seriously

### Step 4.1: Delete the branch locally after editing

```
git branch -d kumar
```

After merging, your branch will be deleted in the remote GitHub repo, so do it locally too

### Step 5: Do not edit in the ```main``` branch

Just check stuff out in the ```main``` branch. Nothing else

### Step 6: See available branches

```
git branch
```
Run this command to see the different branches.

```
  kumar
* main
  nidhi
  preethi
  rishit
```

**Note: Sometimes you wont see your branch in your local machine, just create your new branch**

### Step 7: Switch over to your branch

Switch over to the branch listed above
```
git switch rishit
// or
git switch preethi
```

Make your edits

### Step 8: Before pushing check

You need to do 3 basic things before you push: status, add and commit. Easy

```
git status
```
Not necessary, but just check if everything's alright

```
git add .
```

And then 

```
git commit -m "updated this feature"
```

### Step 9: Push the changes

**Btw: Make sure you are in your branch only**


```
git push -u origin rishit
```

Then normally you can do 
```
git push 
```

### Step 10: Do a Pull Request

Go to your GitHub account, and do Compare & Pull Request

This will compare to the ```main``` branch to your branch. And do a Pull request

Even I don't have much experience in this part, but we will learn this together.
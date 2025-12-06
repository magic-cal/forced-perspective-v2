1 Dec - 
- Basically we have a POC
- Performance improvements
    - Images and stuff could be cached 
    - Refresh time is lots 
- VR support 
- Some minor bugs, refresh fixes 
- Controlls need be useable by different people 
- Too many states 
- Maybe some checkpoints
- Sphere alignment happens at different times for A and S 
- State changes progress too quickly automatically


Notes:
- Possible issue with reset not full resetting things 
- Possible issue with facing of VR model (was after reset ) Looks fine when not
- Next step, reveal of cards and things 
- Jumping after finish 180 d animation 
- Storyline, world, 3d images, flocking cards
- Tests or similar? Not sure how to in 3d? 


# Critical path

- [x] View of all cards simple
- [x] View of all cards with animation
- [x] Card interaction
- [x] Card switching
- [x] Perspective mirroring with alternate view

# Bugs

- [x] Map card index to card (not position/ card id)
- [ ] Not connecting with phone
- [x] Certificate issue with local dev

# Tidies/ Improvements

- [x] Decouple the Dom and interactive elements - Tidy up
- [x] Move the socket to a separate file
- [x] Move the cards logic to a manager
- [ ] Don't expose the mesh of the card
- [x] Cards surrounding user
- [ ] CI/CD pipeline
- [ ] Get controller raycast to match UI
- [ ] Provide a cleaner UI to interact with
- [ ] Make a interface for perspective mirroring

# Nice to have

- [ ] Different kinds of animations
- [ ] Different kinds of cards/ objects
- [ ] fix jittery issues with updates
- [ ] Path aliasing

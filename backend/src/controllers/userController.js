const User = require('../models/User');

const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { nombre, email } = req.body;

    const user = await User.create({ nombre, email });

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

const editUser = async (req, res, next) => {
  try {
    const { nombre, email } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { nombre, email },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        ok: false,
        message: 'Usuario no encontrado'
      });
    }

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        ok: false,
        message: 'Usuario no encontrado'
      });
    }

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  createUser,
  editUser,
  deleteUser
};